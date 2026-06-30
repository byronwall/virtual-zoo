import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getBackgroundRemovalRetryCandidates,
  getThumbnailPath,
  getZooImagePath,
  type getZooSnapshot,
  markBackgroundRemovalCompleted,
  markBackgroundRemovalFailed,
  markBackgroundRemovalPending,
} from "./store";

const defaultServiceUrl = "http://rembg:7000";
let recoveryStarted = false;

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
    const responseText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Image helper ${endpoint} failed with ${response.status}: ${responseText.slice(0, 500)}`,
    );
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

export const createThumbnailImage = async (input: {
  bytes: Uint8Array;
  filename: string;
}) => {
  if (!shouldUseService()) return null;
  return postImageForBytes("/thumbnail", input.bytes, input.filename);
};

export const ensureThumbnailImage = async (displayPath: string) => {
  const thumbnailPath = getThumbnailPath(displayPath);
  const outputPath = getZooImagePath(thumbnailPath);
  if (await fileExists(outputPath)) return thumbnailPath;

  const displayBytes = await readFile(getZooImagePath(displayPath));
  const thumbnailBytes = await createThumbnailImage({
    bytes: displayBytes,
    filename: path.basename(displayPath),
  });
  if (!thumbnailBytes) return null;

  await writeFile(outputPath, thumbnailBytes);
  return thumbnailPath;
};

export const ensureSnapshotThumbnails = async (
  snapshot: Awaited<ReturnType<typeof getZooSnapshot>>,
) => {
  await Promise.allSettled(
    snapshot.animals.map((animal) => ensureThumbnailImage(animal.image.displayPath)),
  );
};

export const queueBackgroundRemoval = (input: {
  animalId: string;
  displayPath: string;
  processedPath: string;
}) => {
  if (!shouldUseService()) return;
  console.info("Queueing stuffed zoo background removal", {
    animalId: input.animalId,
    displayPath: input.displayPath,
    processedPath: input.processedPath,
  });
  void removeBackground(input).catch(async (error: unknown) => {
    console.error("Stuffed zoo background removal failed", {
      animalId: input.animalId,
      error,
    });
    await markBackgroundRemovalFailed(
      input.animalId,
      error instanceof Error ? error.message : "Background removal failed.",
    );
  });
};

export const ensureBackgroundRemovalRecoveryStarted = () => {
  if (recoveryStarted || !shouldUseService()) return;
  recoveryStarted = true;
  void recoverBackgroundRemovalQueue().catch((error: unknown) => {
    console.error("Stuffed zoo background removal recovery failed", { error });
  });
};

const recoverBackgroundRemovalQueue = async () => {
  const candidates = await getBackgroundRemovalRetryCandidates();
  if (candidates.length === 0) {
    console.info("Stuffed zoo background removal recovery found no queued images.");
    return;
  }

  console.info("Stuffed zoo background removal recovery requeueing images", {
    count: candidates.length,
    failed: candidates.filter((candidate) => candidate.previousStatus === "failed").length,
    pending: candidates.filter((candidate) => candidate.previousStatus === "pending").length,
  });

  for (const candidate of candidates) {
    await markBackgroundRemovalPending(candidate.animalId);
    queueBackgroundRemoval(candidate);
  }
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
  const thumbnailBytes = await createThumbnailImage({
    bytes: output,
    filename: path.basename(input.processedPath),
  });
  if (thumbnailBytes) {
    await writeFile(getZooImagePath(getThumbnailPath(input.displayPath)), thumbnailBytes);
  }
  await markBackgroundRemovalCompleted(input.animalId, input.processedPath);
};

const fileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};
