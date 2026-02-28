"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import Replicate from "replicate";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";
import { estimateReplicateCostUsd } from "../lib/apiCost";

interface StyleProfile {
  primaryStyle: string;
  secondaryStyle?: string;
  colorPreferences: string[];
  emotionalVibe?: string;
  decorDensity?: string;
  colorPattern?: string;
}

function buildInteriorPrompt(userPrompt: string, styleProfile?: StyleProfile | null): string {
  const parts = [
    "Photorealistic interior photo of the provided room",
  ];

  if (styleProfile) {
    const styleParts: string[] = [];
    styleParts.push(`${styleProfile.primaryStyle} interior design style`);
    if (styleProfile.secondaryStyle) {
      styleParts.push(`with ${styleProfile.secondaryStyle} influences`);
    }
    if (styleProfile.emotionalVibe) {
      const vibeDescriptions: Record<string, string> = {
        serenity: "serene and calming atmosphere",
        energy: "energetic and vibrant atmosphere",
        cozy: "warm and cozy atmosphere",
        order: "clean and orderly atmosphere",
      };
      styleParts.push(vibeDescriptions[styleProfile.emotionalVibe] || "");
    }
    if (styleProfile.colorPreferences.length > 0) {
      styleParts.push(`color palette: ${styleProfile.colorPreferences.slice(0, 4).join(", ")}`);
    }
    if (styleProfile.decorDensity) {
      const densityDescriptions: Record<string, string> = {
        purist: "minimal decor with clean surfaces",
        curator: "thoughtfully curated decor",
        collector: "richly layered decor and accessories",
      };
      styleParts.push(densityDescriptions[styleProfile.decorDensity] || "");
    }
    parts.push(styleParts.filter(Boolean).join(", "));
  }

  parts.push(
    "Keep the layout, architecture, camera angle, lighting, materials, and colors unchanged unless explicitly specified",
    `Apply only these changes: ${userPrompt}`,
    "Do not add, remove, or move other objects",
    "Professional real estate photography, natural lighting, highly detailed",
  );

  return parts.join(", ");
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
    ikeaProductImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = "google/nano-banana";
    let replicateCalled = false;
    let estimatedCostUsd = 0;

    const logger = createLogger("imageGeneration", {
      visualizationId: args.visualizationId,
      roomId: args.roomId,
      type: args.type,
    });

    try {
      logger.info("Starting image generation");

      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      // Fetch style profile from the room's project
      const room = await ctx.runQuery(internal.rooms.get, { id: args.roomId });
      let styleProfile: StyleProfile | null = null;
      if (room) {
        const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
        if (project?.styleProfile) {
          styleProfile = project.styleProfile;
        }
      }

      const originalUrl = await ctx.storage.getUrl(args.originalPhotoId);
      if (!originalUrl) {
        logger.error("Failed to get original image URL");
        throw new Error("Failed to get original image URL");
      }

      logger.info("Retrieved original image URL");

      // Build image_input: selected room photo + optional IKEA product image
      const imageInput: string[] = [originalUrl];
      if (args.ikeaProductImageUrl) {
        imageInput.push(args.ikeaProductImageUrl);
      }

      logger.info("Built image_input", { count: imageInput.length, hasIkeaProduct: !!args.ikeaProductImageUrl });

      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateToken) {
        logger.error("Replicate API token not configured");
        throw new Error("Replicate API token (REPLICATE_API_TOKEN) is not configured");
      }

      const replicate = new Replicate({ auth: replicateToken });

      logger.info("Calling Replicate API", { model });
      // Wrap Replicate API call in retry logic to handle transient failures
      const rawOutput = await withRetry(
        () => replicate.run(
          model,
          {
            input: {
              prompt: buildInteriorPrompt(args.prompt, styleProfile),
              image_input: imageInput,
            },
          }
        ),
        { maxRetries: 3, baseDelay: 2000, maxDelay: 16000 }
      );
      replicateCalled = true;
      estimatedCostUsd = estimateReplicateCostUsd(model, 1);

      logger.info("Received Replicate response");

      const resolved = await resolveVisualizationOutput(rawOutput);
      let storageId;

      if (resolved.kind === "url") {
        logger.info("Downloading generated image from URL");
        const response = await fetch(resolved.url);
        if (!response.ok) {
          logger.error("Failed to download generated image", null, {
            status: response.status,
            statusText: response.statusText,
          });
          throw new Error(`Failed to download generated image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        storageId = await ctx.storage.store(blob);
      } else {
        logger.info("Storing generated image from blob");
        storageId = await ctx.storage.store(resolved.blob);
      }

      logger.info("Image stored successfully", { storageId });

      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        logger.error("Failed to get storage URL for generated image");
        throw new Error("Failed to get storage URL for generated image");
      }

      await ctx.runMutation(internal.visualizations.complete, {
        id: args.visualizationId,
        storageId,
        url,
      });

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "replicate",
          model,
          operation: "visualization",
          status: "success",
          estimatedCostUsd,
          units: 1,
          roomId: args.roomId,
        });
      } catch (trackingError) {
        logger.warn("Failed to track API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }

      logger.info("Visualization generation completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Image generation failed", error);

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "replicate",
          model,
          operation: "visualization",
          status: "failed",
          estimatedCostUsd: replicateCalled ? estimatedCostUsd : 0,
          units: 1,
          roomId: args.roomId,
          errorMessage,
        });
      } catch (trackingError) {
        logger.warn("Failed to track failed API usage", {
          trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError),
        });
      }

      try {
        await ctx.runMutation(internal.visualizations.fail, {
          id: args.visualizationId,
          error: errorMessage || "Unknown error occurred during generation",
        });
      } catch (failError) {
        console.error(`Failed to record failure status:`, failError);
      }
    }
  },
});

type ResolvedVisualizationOutput =
  | { kind: "url"; url: string }
  | { kind: "blob"; blob: Blob };

type ReplicateOutputObject = {
  toString?: () => string;
  url?: unknown;
  blob?: () => Promise<unknown>;
  constructor?: { name?: string };
};

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
      const obj = value as ReplicateOutputObject;

      if (typeof obj.toString === "function") {
        try {
          const str = obj.toString();
          if (typeof str === "string" && str.startsWith("http")) {
            return { kind: "url", url: str };
          }
        } catch {
          /* ignore */
        }
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
          } catch {
            /* ignore */
          }
        }
      }

      if (typeof obj.blob === "function") {
        try {
          const b = await obj.blob();
          if (b instanceof Blob) return { kind: "blob", blob: b };
        } catch {
          /* ignore */
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

  const diagnostic = {
    type: typeof output,
    constructor: typeof output === "object" && output !== null
      ? (output as ReplicateOutputObject).constructor?.name
      : undefined,
    isArray: Array.isArray(output),
    keys: typeof output === "object" && output !== null ? Object.keys(output) : [],
    json: JSON.stringify(output),
  };
  console.error("Unresolvable Replicate output diagnostic:", diagnostic);

  throw new Error("Unable to determine output asset from Replicate response");
}
