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
        "content-type": "image/webp",
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
  extname(normalized).toLowerCase() === ".webp" &&
  (normalized.startsWith("images/unprocessed/") ||
    normalized.startsWith("images/processed/"));
