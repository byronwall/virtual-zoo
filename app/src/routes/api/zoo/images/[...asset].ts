import { readFile } from "node:fs/promises";
import { basename, extname, normalize } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import { getZooImagePath } from "~/lib/stuffed-zoo/store";

const contentTypeForPath = (filePath: string) => {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".heic") return "image/heic";
  return "image/jpeg";
};

export async function GET(event: APIEvent) {
  requireZooPasscode(event);
  const asset = String(event.params.asset ?? "");
  const normalized = normalize(asset);
  if (normalized.startsWith("..") || normalized.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const resolved = await readImageAsset(normalized);
    const isThumbnail = normalized.startsWith("images/thumbnails/");
    return new Response(resolved.bytes, {
      headers: {
        "content-type": contentTypeForPath(resolved.path),
        "cache-control": isThumbnail
          ? "private, max-age=31536000, immutable"
          : "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const readImageAsset = async (normalized: string) => {
  try {
    return {
      path: normalized,
      bytes: await readFile(getZooImagePath(normalized)),
    };
  } catch (error) {
    const fallbackPath = await thumbnailFallbackPath(normalized);
    if (!fallbackPath) throw error;
    return {
      path: fallbackPath,
      bytes: await readFile(getZooImagePath(fallbackPath)),
    };
  }
};

const thumbnailFallbackPath = async (normalized: string) => {
  if (!normalized.startsWith("images/thumbnails/")) return null;
  const base = basename(normalized, extname(normalized));
  if (!base) return null;
  return findExistingImagePath([
    `images/display/${base}.jpg`,
    `images/display/${base}.jpeg`,
    `images/display/${base}.png`,
    `images/display/${base}.webp`,
  ]);
};

const findExistingImagePath = async (candidates: string[]) => {
  for (const candidate of candidates) {
    try {
      await readFile(getZooImagePath(candidate));
      return candidate;
    } catch {
      // Try the next likely display-image extension.
    }
  }
  return null;
};
