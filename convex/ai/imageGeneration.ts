"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import Replicate from "replicate";

const NEGATIVE_PROMPT = `cartoon, anime, illustration, painting, drawing, art, sketch, low quality, blurry, distorted, watermark, text, logo, oversaturated, deformed, ugly, bad anatomy`;

function buildInteriorPrompt(userPrompt: string): string {
  return [
    "Photorealistic interior photo of the provided room",
    "Keep the layout, architecture, camera angle, lighting, materials, and colors unchanged unless explicitly specified",
    `Apply only these changes: ${userPrompt}`,
    "Do not add, remove, or move other objects",
    "Professional real estate photography, natural lighting, highly detailed",
  ].join(", ");
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
    const logPrefix = `[Visualization ${args.visualizationId}]`;
    try {
      console.log(`${logPrefix} Starting generation for room ${args.roomId}`);
      
      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      console.log(`${logPrefix} Fetching original image URL`);
      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) {
        throw new Error("Failed to get original image URL");
      }

      const inputImageUrl = originalUrl;

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) {
        throw new Error("Replicate API token (REPLICATE_API_TOKEN) is not configured");
      }

      const replicate = new Replicate({
        auth: replicateToken,
      });

      console.log(`${logPrefix} Calling Replicate API`);
      // Use SD2.1 img2img for a lighter, cheaper model while preserving room structure.
      const rawOutput = await replicate.run(
        "google/nano-banana",
        {
          input: {
            prompt: buildInteriorPrompt(args.prompt),
            image_input: [inputImageUrl],
            // negative_prompt: NEGATIVE_PROMPT,
            // prompt_strength: Math.min(Math.max(args.strength, 0), 1),
            // num_inference_steps: 25, // Slightly increased for better quality
            // guidance_scale: 7.5,
            // scheduler: "DPMSolverMultistep",
            // num_outputs: 1,
          },
        }
      );

      console.log(`${logPrefix} Replicate call complete, resolving output`);
      const resolved = await resolveVisualizationOutput(rawOutput);
      let storageId;

      if (resolved.kind === "url") {
        console.log(`${logPrefix} Downloading generated image from ${resolved.url}`);
        const response = await fetch(resolved.url);
        if (!response.ok) {
          throw new Error(`Failed to download generated image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log(`${logPrefix} Storing generated image in Convex`);
        storageId = await ctx.storage.store(blob);
      } else {
        console.log(`${logPrefix} Storing generated blob in Convex`);
        storageId = await ctx.storage.store(resolved.blob);
      }

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new Error("Failed to get storage URL for generated image");
      }

      console.log(`${logPrefix} Completing visualization record`);
      await ctx.runMutation(internal.visualizations.complete, {
        id: args.visualizationId,
        storageId,
        url,
      });
      console.log(`${logPrefix} Successfully finished`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix} Image generation failed:`, error);
      
      try {
        await ctx.runMutation(internal.visualizations.fail, {
          id: args.visualizationId,
          error: errorMessage || "Unknown error occurred during generation",
        });
      } catch (failError) {
        console.error(`${logPrefix} Failed to record failure status:`, failError);
      }
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

    // 1. Strings (URLs or Data URIs)
    if (typeof value === "string") {
      if (value.startsWith("http")) return { kind: "url", url: value };
      if (value.startsWith("data:")) {
        try {
          const response = await fetch(value);
          if (response.ok) return { kind: "blob", blob: await response.blob() };
        } catch (e) {
          console.error("Failed to fetch data URI:", e);
        }
      }
    }

    // 2. URL objects
    if (value instanceof URL) {
      return { kind: "url", url: value.toString() };
    }

    // 3. Blobs and Files
    if (value instanceof Blob) {
      return { kind: "blob", blob: value };
    }

    // 4. Buffers and Views
    if (value instanceof ArrayBuffer) {
      return { kind: "blob", blob: new Blob([new Uint8Array(value)]) };
    }
    if (ArrayBuffer.isView(value)) {
      return { kind: "blob", blob: toSafeBlob(value as ArrayBufferView) };
    }

    // 5. Objects with specific properties or methods
    if (typeof value === "object") {
      const obj = value as any;

      // Handle objects that stringify to a URL (common for Replicate's FileOutput)
      if (typeof obj.toString === "function") {
        try {
          const str = obj.toString();
          if (typeof str === "string" && str.startsWith("http")) {
            return { kind: "url", url: str };
          }
        } catch (e) { /* ignore */ }
      }

      // Handle { url: ... } or { url() }
      if (obj.url) {
        if (typeof obj.url === "string" && obj.url.startsWith("http")) {
          return { kind: "url", url: obj.url };
        }
        if (obj.url instanceof URL) {
          return { kind: "url", url: obj.url.toString() };
        }
        if (typeof obj.url === "function") {
          try {
            const res = obj.url();
            if (typeof res === "string" && res.startsWith("http")) return { kind: "url", url: res };
            if (res instanceof URL) return { kind: "url", url: res.toString() };
          } catch (e) { /* ignore */ }
        }
      }

      // Handle objects with a blob() method (like Response or similar)
      if (typeof obj.blob === "function") {
        try {
          const b = await obj.blob();
          if (b instanceof Blob) return { kind: "blob", blob: b };
        } catch (e) { /* ignore */ }
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

  // Diagnostics for unresolvable output
  const diagnostic = {
    type: typeof output,
    constructor: (output as any)?.constructor?.name,
    isArray: Array.isArray(output),
    keys: typeof output === "object" && output !== null ? Object.keys(output) : [],
    json: JSON.stringify(output),
  };
  console.error("Unresolvable Replicate output diagnostic:", diagnostic);
  
  throw new Error("Unable to determine output asset from Replicate response");
}
