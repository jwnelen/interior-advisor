"use node";

import { inflateSync, deflateSync } from "zlib";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { withRetry } from "../lib/retry";
import { createLogger } from "../lib/logger";
import { estimateGeminiImageCostUsd } from "../lib/apiCost";
import { env } from "../lib/env";

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

// ---------------------------------------------------------------------------
// Aspect-ratio utilities (pure Node.js, no native deps)
// ---------------------------------------------------------------------------

function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } {
  if (mimeType.includes("png")) {
    // PNG IHDR: signature(8) + chunk_length(4) + "IHDR"(4) + width(4) + height(4)
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    // Scan for SOF0/SOF1/SOF2 markers (0xFF 0xC0–0xC2)
    let i = 2; // skip SOI marker
    while (i < buffer.length - 8) {
      if (buffer[i] !== 0xFF) break;
      const marker = buffer[i + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
      }
      if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
      i += 2 + buffer.readUInt16BE(i + 2);
    }
  }
  throw new Error(`Cannot parse dimensions for mime type: ${mimeType}`);
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function makeCrc32Table(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
const CRC32_TABLE = makeCrc32Table();

function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF]! ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Center-crops a PNG buffer to match targetWidth:targetHeight aspect ratio.
 * Returns the original buffer unchanged if the ratio already matches or the
 * PNG colour type/bit-depth is unsupported.
 */
function cropPngToAspectRatio(buffer: Buffer, targetWidth: number, targetHeight: number): Buffer {
  if (!buffer.slice(0, 8).equals(PNG_SIG)) return buffer;

  // Parse chunks
  let srcWidth = 0, srcHeight = 0, colorType = 2, bitDepth = 8;
  const idatParts: Buffer[] = [];
  let offset = 8;
  while (offset < buffer.length - 12) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString("ascii");
    const data = buffer.slice(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      srcWidth = data.readUInt32BE(0);
      srcHeight = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
    } else if (type === "IDAT") {
      idatParts.push(data);
    }
    offset += 12 + len;
    if (type === "IEND") break;
  }

  // Only handle 8-bit RGB (2) or RGBA (6)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels || bitDepth !== 8) return buffer;

  const srcAspect = srcWidth / srcHeight;
  const tgtAspect = targetWidth / targetHeight;
  if (Math.abs(srcAspect - tgtAspect) < 0.01) return buffer; // close enough

  // Inflate all IDAT data
  const raw = inflateSync(Buffer.concat(idatParts));

  // Unfilter rows into a flat pixel buffer
  const bpp = channels;
  const stride = 1 + srcWidth * bpp;
  const pixels = Buffer.alloc(srcHeight * srcWidth * bpp);
  for (let y = 0; y < srcHeight; y++) {
    const ft = raw[y * stride]!;
    const rowIn = y * stride + 1;
    const rowOut = y * srcWidth * bpp;
    const prevOut = (y - 1) * srcWidth * bpp;
    for (let x = 0; x < srcWidth * bpp; x++) {
      const fv = raw[rowIn + x]!;
      const a = x >= bpp ? pixels[rowOut + x - bpp]! : 0;
      const b = y > 0 ? pixels[prevOut + x]! : 0;
      const c = (x >= bpp && y > 0) ? pixels[prevOut + x - bpp]! : 0;
      let r: number;
      switch (ft) {
        case 1: r = (fv + a) & 0xFF; break;
        case 2: r = (fv + b) & 0xFF; break;
        case 3: r = (fv + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: r = (fv + paethPredictor(a, b, c)) & 0xFF; break;
        default: r = fv;
      }
      pixels[rowOut + x] = r;
    }
  }

  // Compute crop box (center crop)
  let cropX = 0, cropY = 0, cropW = srcWidth, cropH = srcHeight;
  if (srcAspect > tgtAspect) {
    cropW = Math.round(srcHeight * tgtAspect);
    cropX = Math.floor((srcWidth - cropW) / 2);
  } else {
    cropH = Math.round(srcWidth / tgtAspect);
    cropY = Math.floor((srcHeight - cropH) / 2);
  }

  // Build cropped raw data (filter type 0 = None)
  const croppedStride = 1 + cropW * bpp;
  const croppedRaw = Buffer.alloc(cropH * croppedStride);
  for (let y = 0; y < cropH; y++) {
    croppedRaw[y * croppedStride] = 0; // filter None
    const src = ((cropY + y) * srcWidth + cropX) * bpp;
    pixels.copy(croppedRaw, y * croppedStride + 1, src, src + cropW * bpp);
  }

  // Build new PNG
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(cropW, 0); ihdr.writeUInt32BE(cropH, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIG,
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", deflateSync(croppedRaw)),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

const PROMPT_COMPACT_THRESHOLD = 500;

async function compactPrompt(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a prompt compactor for an image generation model. Rewrite the given interior design change description as a single, dense sentence under 300 characters. Preserve all specific items, colors, materials, and key details. Output only the compacted prompt, nothing else.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 100,
  });
  return response.choices[0].message.content?.trim() ?? prompt;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/png";
  return { data, mimeType };
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
    productImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = env.GEMINI_IMAGE_MODEL;
    let apiCalled = false;
    let estimatedCostUsd = 0;

    const logger = createLogger("imageGeneration", {
      visualizationId: args.visualizationId,
      roomId: args.roomId,
      type: args.type,
    });

    try {
      const t0 = Date.now();
      logger.info("Starting image generation");

      await ctx.runMutation(internal.visualizations.updateStatus, {
        id: args.visualizationId,
        status: "processing",
      });

      // Fetch style profile and original image URL in parallel
      const [room, originalUrl] = await Promise.all([
        ctx.runQuery(internal.rooms.get, { id: args.roomId }),
        ctx.storage.getUrl(args.originalPhotoId),
      ]);

      if (!originalUrl) {
        logger.error("Failed to get original image URL");
        throw new Error("Failed to get original image URL");
      }

      let styleProfile: StyleProfile | null = null;
      if (room) {
        const project = await ctx.runQuery(internal.projects.get, { id: room.projectId });
        if (project?.styleProfile) {
          styleProfile = project.styleProfile;
        }
      }

      logger.info(`Setup done in ${Date.now() - t0}ms`);

      // Fetch room photo and IKEA product image in parallel
      const t1 = Date.now();
      const [roomImage, productImage] = await Promise.all([
        fetchImageAsBase64(originalUrl),
        args.productImageUrl ? fetchImageAsBase64(args.productImageUrl) : Promise.resolve(null),
      ]);
      // Detect room photo aspect ratio for post-processing
      const roomBuffer = Buffer.from(roomImage.data, "base64");
      let roomDims: { width: number; height: number } | null = null;
      try {
        roomDims = getImageDimensions(roomBuffer, roomImage.mimeType);
      } catch {
        logger.warn("Could not detect room image dimensions, skipping crop");
      }

      logger.info(`Image fetch done in ${Date.now() - t1}ms`, {
        roomImageBytes: Math.round(roomImage.data.length * 0.75),
        hasProductImage: !!productImage,
        roomDims,
      });

      // Compact prompt if it's long before passing to Gemini
      const effectivePrompt = args.prompt.length > PROMPT_COMPACT_THRESHOLD
        ? await compactPrompt(args.prompt)
        : args.prompt;
      if (args.prompt.length > PROMPT_COMPACT_THRESHOLD) {
        logger.info("Compacted prompt", { original: args.prompt.length, compacted: effectivePrompt.length });
      }

      // Build prompt parts: text + room image + optional product image
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: buildInteriorPrompt(effectivePrompt, styleProfile) },
        {
          inlineData: {
            mimeType: roomImage.mimeType,
            data: roomImage.data,
          },
        },
      ];

      // Add IKEA product image if provided
      if (productImage) {
        parts.push({
          inlineData: {
            mimeType: productImage.mimeType,
            data: productImage.data,
          },
        });
        logger.info("Added product image to prompt");
      }

      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("Google Gemini API key not configured");
        throw new Error("Google Gemini API key (GOOGLE_GEMINI_API_KEY) is not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      const t2 = Date.now();
      logger.info("Calling Gemini API", { model, withProductImage: !!productImage });

      const callGemini = (partsToSend: typeof parts) =>
        withRetry(
          () => ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: partsToSend }],
            config: { responseModalities: ["IMAGE", "TEXT"] },
          }),
          { maxRetries: 3, baseDelay: 2000, maxDelay: 16000 }
        );

      let response;
      if (productImage) {
        try {
          response = await callGemini(parts);
        } catch (err) {
          // Product image may have caused the failure — retry with room photo only
          logger.warn("Gemini failed with product image, retrying without it", {
            error: err instanceof Error ? err.message : String(err),
          });
          const partsWithoutProduct = parts.slice(0, 2); // text + room photo only
          response = await callGemini(partsWithoutProduct);
        }
      } else {
        response = await callGemini(parts);
      }
      apiCalled = true;
      estimatedCostUsd = estimateGeminiImageCostUsd(model, 1);

      logger.info(`Gemini API responded in ${Date.now() - t2}ms`);

      // Extract generated image from response
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error("No content in Gemini response");
      }

      let imageData: string | null = null;
      let imageMimeType = "image/png";

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data ?? null;
          imageMimeType = part.inlineData.mimeType ?? "image/png";
          break;
        }
      }

      if (!imageData) {
        throw new Error("No image data in Gemini response");
      }

      // Crop generated image to match the room photo's aspect ratio
      let imageBuffer: Buffer = Buffer.from(imageData, "base64");
      if (roomDims && imageMimeType.includes("png")) {
        try {
          const cropped = cropPngToAspectRatio(imageBuffer, roomDims.width, roomDims.height);
          if (cropped !== imageBuffer) {
            logger.info("Cropped generated image to room aspect ratio", {
              src: `${roomDims.width}x${roomDims.height}`,
            });
          }
          imageBuffer = Buffer.from(cropped);
        } catch (cropErr) {
          logger.warn("Crop failed, using original output", { error: String(cropErr) });
        }
      }

      const blob = new Blob([new Uint8Array(imageBuffer)], { type: imageMimeType });
      const storageId = await ctx.storage.store(blob);

      logger.info(`Image stored in ${Date.now() - t2}ms total (incl. Gemini)`, { storageId });

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
          provider: "google",
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

      logger.info(`Visualization generation completed in ${Date.now() - t0}ms total`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Image generation failed", error);

      try {
        await ctx.runMutation(internal.apiUsage.track, {
          provider: "google",
          model,
          operation: "visualization",
          status: "failed",
          estimatedCostUsd: apiCalled ? estimatedCostUsd : 0,
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
