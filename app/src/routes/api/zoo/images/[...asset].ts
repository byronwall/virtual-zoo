import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
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
    const bytes = await readFile(getZooImagePath(normalized));
    return new Response(bytes, {
      headers: {
        "content-type": contentTypeForPath(normalized),
        "cache-control": "private, max-age=60",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
