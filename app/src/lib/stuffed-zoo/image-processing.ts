import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getZooImagePath, markBackgroundRemovalCompleted, markBackgroundRemovalFailed } from "./store";

const defaultServiceUrl = "http://rembg:7000";

const getServiceUrl = () =>
  process.env.REMBG_SERVICE_URL?.replace(/\/+$/, "") || defaultServiceUrl;

const shouldUseService = () =>
  (process.env.BACKGROUND_REMOVAL_PROVIDER ?? "rembg") === "rembg";

const postImageForBytes = async (endpoint: string, bytes: Uint8Array, filename: string) => {
  const formData = new FormData();
  formData.append("file", new Blob([Buffer.from(bytes)]), filename);
  const response = await fetch(`${getServiceUrl()}${endpoint}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await response.text().catch(() => response.statusText));
  }
  return Buffer.from(await response.arrayBuffer());
};

export const createDisplayImage = async (input: {
  bytes: Uint8Array;
  filename: string;
}) => {
  if (!shouldUseService()) return Buffer.from(input.bytes);
  return postImageForBytes("/prepare", input.bytes, input.filename);
};

export const queueBackgroundRemoval = (input: {
  animalId: string;
  displayPath: string;
  processedPath: string;
}) => {
  if (!shouldUseService()) return;
  void removeBackground(input).catch(async (error: unknown) => {
    await markBackgroundRemovalFailed(
      input.animalId,
      error instanceof Error ? error.message : "Background removal failed.",
    );
  });
};

const removeBackground = async (input: {
  animalId: string;
  displayPath: string;
  processedPath: string;
}) => {
  const displayBytes = await readFile(getZooImagePath(input.displayPath));
  const output = await postImageForBytes(
    "/remove-background",
    displayBytes,
    path.basename(input.displayPath),
  );
  await writeFile(getZooImagePath(input.processedPath), output);
  await markBackgroundRemovalCompleted(input.animalId, input.processedPath);
};
