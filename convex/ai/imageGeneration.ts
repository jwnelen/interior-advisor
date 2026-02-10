"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import Replicate from "replicate";
import Jimp from "jimp";

const NEGATIVE_PROMPT = `cartoon, anime, illustration, painting, drawing, art, sketch, low quality, blurry, distorted, watermark, text, logo, oversaturated, deformed, ugly, bad anatomy`;
const MAX_INPUT_DIMENSION = 768;
const MIN_DIMENSION = 256;

function buildInteriorPrompt(userPrompt: string): string {
  return [
    "Photorealistic interior photo of the provided room",
    "Keep the layout, architecture, camera angle, lighting, materials, and colors unchanged unless explicitly specified",
    `Apply only these changes: ${userPrompt}`,
    "Do not add, remove, or move other objects",
    "Professional real estate photography, natural lighting, highly detailed",
  ].join(", ");
}

function clampToMultipleOf8(value: number): number {
  const clamped = Math.max(MIN_DIMENSION, Math.floor(value / 8) * 8);
  return clamped;
}

async function getResizedInputUrl(
  ctx: { storage: { store: (blob: Blob) => Promise<string>; getUrl: (id: string) => Promise<string | null> } },
  originalUrl: string
): Promise<string> {
  const response = await fetch(originalUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch original image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const image = await Jimp.read(Buffer.from(arrayBuffer));

  const originalWidth = image.bitmap.width;
  const originalHeight = image.bitmap.height;
  const maxDimension = Math.max(originalWidth, originalHeight);

  if (maxDimension <= MAX_INPUT_DIMENSION) {
    return originalUrl;
  }

  const scale = MAX_INPUT_DIMENSION / maxDimension;
  const targetWidth = clampToMultipleOf8(Math.round(originalWidth * scale));
  const targetHeight = clampToMultipleOf8(Math.round(originalHeight * scale));

  image.resize(targetWidth, targetHeight);
  image.quality(85);

  const resizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  const resizedBlob = new Blob([new Uint8Array(resizedBuffer)], { type: Jimp.MIME_JPEG });
  const storageId = await ctx.storage.store(resizedBlob);
  const resizedUrl = await ctx.storage.getUrl(storageId);

  if (!resizedUrl) {
    throw new Error("Failed to get storage URL for resized image");
  }

  return resizedUrl;
}

export const generateVisualization = internalAction({
  args: {
    visualizationId: v.id("visualizations"),
    roomId: v.id("rooms"),
    originalPhotoId: v.id("_storage"),
    prompt: v.string(),
    type: v.string(),
    controlNetMode: v.string(),
    strength: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) {
        throw new Error("Failed to get original image URL");
      }

      const inputImageUrl = await getResizedInputUrl(ctx, originalUrl);

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) {
        throw new Error("Replicate API token (REPLICATE_API_TOKEN) is not configured");
      }

      const replicate = new Replicate({
        auth: replicateToken,
      });

      // Use SD2.1 img2img for a lighter, cheaper model while preserving room structure.
      const rawOutput = await replicate.run(
        "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d",
        {
          input: {
            image: inputImageUrl,
            prompt: buildInteriorPrompt(args.prompt),
            negative_prompt: NEGATIVE_PROMPT,
            prompt_strength: Math.min(Math.max(args.strength, 0), 1),
            num_inference_steps: 20,
            guidance_scale: 7.5,
            scheduler: "DPMSolverMultistep",
            num_outputs: 1,
          },
        }
      );

      const resolved = await resolveVisualizationOutput(rawOutput);
      let storageId;

      if (resolved.kind === "url") {
        const response = await fetch(resolved.url);
        if (!response.ok) {
          throw new Error(`Failed to download generated image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        storageId = await ctx.storage.store(blob);
      } else {
        storageId = await ctx.storage.store(resolved.blob);
      }

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new Error("Failed to get storage URL for generated image");
      }

      await ctx.runMutation(internal.visualizations.complete, {
        id: args.visualizationId,
        storageId,
        url,
      });
    } catch (error) {
      console.error("Image generation failed:", error);
      await ctx.runMutation(internal.visualizations.fail, {
        id: args.visualizationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

type ResolvedVisualizationOutput =
  | { kind: "url"; url: string }
  | { kind: "blob"; blob: Blob };

async function resolveVisualizationOutput(output: unknown): Promise<ResolvedVisualizationOutput> {
  if (!output) {
    throw new Error("No output from Replicate");
  }

  const toSafeBlob = (view: ArrayBufferView): Blob => {
    // Copy into a new ArrayBuffer to avoid SharedArrayBuffer incompatibility with BlobPart.
    const bytes = new Uint8Array(view.byteLength);
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return new Blob([bytes]);
  };

  const tryResolve = async (value: unknown): Promise<ResolvedVisualizationOutput | null> => {
    if (!value) return null;

    if (typeof value === "function") {
      return null;
    }

    if (typeof value === "string") {
      if (value.startsWith("http")) {
        return { kind: "url", url: value };
      }
      if (value.startsWith("data:")) {
        const response = await fetch(value);
        if (!response.ok) return null;
        const blob = await response.blob();
        return { kind: "blob", blob };
      }
    }

    if (value instanceof URL) {
      return { kind: "url", url: value.toString() };
    }

    if (ArrayBuffer.isView(value)) {
      return { kind: "blob", blob: toSafeBlob(value) };
    }

    if (value instanceof ArrayBuffer) {
      return { kind: "blob", blob: new Blob([value]) };
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;

      if (typeof record.url === "string") {
        return { kind: "url", url: record.url };
      }

      if (typeof record.url === "function") {
        const maybeUrl = record.url();
        if (typeof maybeUrl === "string") {
          return { kind: "url", url: maybeUrl };
        }
        if (maybeUrl instanceof URL) {
          return { kind: "url", url: maybeUrl.toString() };
        }
      }

      if (typeof (record.url as URL | undefined)?.toString === "function") {
        return { kind: "url", url: (record.url as URL).toString() };
      }

      if (typeof record.toString === "function") {
        const stringified = record.toString();
        if (typeof stringified === "string" && stringified.startsWith("http")) {
          return { kind: "url", url: stringified };
        }
      }

      if (typeof (record.blob as (() => Promise<Blob>) | undefined) === "function") {
        const blob = await (record.blob as () => Promise<Blob>)();
        return { kind: "blob", blob };
      }

      if ("data" in record) {
        const data = record.data;
        if (data instanceof ArrayBuffer) {
          return { kind: "blob", blob: new Blob([data]) };
        }
        if (ArrayBuffer.isView(data)) {
          return { kind: "blob", blob: toSafeBlob(data as ArrayBufferView) };
        }
      }
    }

    return null;
  };

  if (Array.isArray(output)) {
    for (const item of output) {
      const resolved = await tryResolve(item);
      if (resolved) return resolved;
    }
  }

  const resolved = await tryResolve(output);
  if (resolved) return resolved;

  throw new Error("Unable to determine output asset from Replicate response");
}
