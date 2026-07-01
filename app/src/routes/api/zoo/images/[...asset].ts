import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import { getZooImagePath } from "~/lib/stuffed-zoo/store";

export async function GET(event: APIEvent) {
  requireZooPasscode(event);
  const asset = String(event.params.asset ?? "");
  const normalized = normalize(asset);
  if (!isClientImagePath(normalized)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return new Response(await readFile(getZooImagePath(normalized)), {
      headers: {
        "content-type": getImageContentType(normalized),
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const isClientImagePath = (normalized: string) =>
  !normalized.startsWith("..") &&
  !normalized.startsWith("/") &&
  isClientImageExtension(normalized) &&
  (normalized.startsWith("images/unprocessed/") ||
    normalized.startsWith("images/processed/") ||
    normalized.startsWith("images/display/"));

const isClientImageExtension = (normalized: string) =>
  [".webp", ".png", ".jpg", ".jpeg"].includes(extname(normalized).toLowerCase());

const getImageContentType = (normalized: string) => {
  switch (extname(normalized).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "image/webp";
  }
};
