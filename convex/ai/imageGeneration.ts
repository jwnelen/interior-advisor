"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import Replicate from "replicate";

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

      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) {
        throw new Error("Failed to get original image URL");
      }

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) {
        throw new Error("Replicate API token (REPLICATE_API_TOKEN) is not configured");
      }

      const replicate = new Replicate({ auth: replicateToken });

      console.log(`${logPrefix} Calling Replicate API`);
      const rawOutput = await replicate.run(
        "google/nano-banana",
        {
          input: {
            prompt: buildInteriorPrompt(args.prompt),
            image_input: [originalUrl],
          },
        }
      );

      console.log(`${logPrefix} Resolving output`);
      const resolved = await resolveVisualizationOutput(rawOutput);
      let storageId;

      if (resolved.kind === "url") {
        console.log(`${logPrefix} Downloading generated image`);
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
    const bytes = new Uint8Array(view.byteLength);
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return new Blob([bytes]);
  };

  const tryResolve = async (value: unknown): Promise<ResolvedVisualizationOutput | null> => {
    if (!value) return null;

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

    if (value instanceof URL) {
      return { kind: "url", url: value.toString() };
    }

    if (value instanceof Blob) {
      return { kind: "blob", blob: value };
    }

    if (value instanceof ArrayBuffer) {
      return { kind: "blob", blob: new Blob([new Uint8Array(value)]) };
    }
    if (ArrayBuffer.isView(value)) {
      return { kind: "blob", blob: toSafeBlob(value as ArrayBufferView) };
    }

    if (typeof value === "object") {
      const obj = value as any;

      if (typeof obj.toString === "function") {
        try {
          const str = obj.toString();
          if (typeof str === "string" && str.startsWith("http")) {
            return { kind: "url", url: str };
          }
        } catch (e) { /* ignore */ }
      }

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
