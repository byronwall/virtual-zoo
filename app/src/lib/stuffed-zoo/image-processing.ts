import { randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getBackgroundRemovalRetryCandidates,
  getProcessedPath,
  getUnprocessedPath,
  getZooImagePath,
  type getZooSnapshot,
  markBackgroundRemovalCompleted,
  markBackgroundRemovalFailed,
  markBackgroundRemovalPending,
  replaceUnprocessedImage,
} from "./store";

const defaultServiceUrl = "http://rembg:7000";
let recoveryStarted = false;

const backgroundRemovalVersion =
  "rembg-u2net-mask-threshold1-grow50-shrink26-feather2-frame86-webp-unprocessed512";

const getServiceUrl = () =>
  process.env.REMBG_SERVICE_URL?.replace(/\/+$/, "") || defaultServiceUrl;

const shouldUseService = () =>
  (process.env.BACKGROUND_REMOVAL_PROVIDER ?? "rembg") === "rembg";

const postImageForBytes = async (
  endpoint: string,
  bytes: Uint8Array,
  filename: string,
  headers: Record<string, string> = {},
) => {
  const formData = new FormData();
  formData.append("file", new Blob([Buffer.from(bytes)]), filename);
  const response = await fetch(`${getServiceUrl()}${endpoint}`, {
    method: "POST",
    headers,
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

export const createUnprocessedImage = async (input: {
  bytes: Uint8Array;
  filename: string;
}) => {
  if (!shouldUseService()) {
    throw new Error("The image helper is required to create the unprocessed WebP.");
  }
  return postImageForBytes("/unprocessed", input.bytes, input.filename);
};

export const ensureSnapshotUnprocessedImages = async (
  snapshot: Awaited<ReturnType<typeof getZooSnapshot>>,
) => {
  for (const animal of snapshot.animals) {
    if (await hasClientReadyUnprocessedImage(animal.image.unprocessedPath)) continue;

    const nextUnprocessedPath = getUnprocessedPath(
      path.basename(animal.image.unprocessedPath, path.extname(animal.image.unprocessedPath)),
    );
    const originalBytes = await readFile(getZooImagePath(animal.image.originalPath));
    const unprocessedBytes = await createUnprocessedImage({
      bytes: originalBytes,
      filename: path.basename(animal.image.originalPath),
    });
    await writeFile(getZooImagePath(nextUnprocessedPath), unprocessedBytes);
    const migratedAnimal = await replaceUnprocessedImage({
      id: animal.id,
      unprocessedPath: nextUnprocessedPath,
    });
    queueBackgroundRemoval({
      animalId: migratedAnimal.id,
      unprocessedPath: migratedAnimal.image.unprocessedPath,
      processedPath: getProcessedPath(migratedAnimal.image.unprocessedPath),
    });
  }
};

export const queueBackgroundRemoval = (input: {
  animalId: string;
  unprocessedPath: string;
  processedPath: string;
}) => {
  if (!shouldUseService()) return;
  console.info("Queueing stuffed zoo background removal", {
    animalId: input.animalId,
    unprocessedPath: input.unprocessedPath,
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
    await logBackgroundRemovalBacklog("after failure");
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
  const candidates = await getBackgroundRemovalRetryCandidates(backgroundRemovalVersion);
  if (candidates.length === 0) {
    console.info("Stuffed zoo background removal recovery found no queued images.");
    return;
  }

  console.info("Stuffed zoo background removal recovery requeueing images", {
    count: candidates.length,
    failed: candidates.filter((candidate) => candidate.previousStatus === "failed").length,
    pending: candidates.filter((candidate) => candidate.previousStatus === "pending").length,
    stale: candidates.filter(
      (candidate) =>
        candidate.previousStatus === "completed" &&
        candidate.previousVersion !== backgroundRemovalVersion,
    ).length,
  });

  for (const candidate of candidates) {
    await markBackgroundRemovalPending(candidate.animalId);
    queueBackgroundRemoval(candidate);
  }
};

const removeBackground = async (input: {
  animalId: string;
  unprocessedPath: string;
  processedPath: string;
}) => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  console.info("Stuffed zoo background removal started", {
    animalId: input.animalId,
    unprocessedPath: input.unprocessedPath,
    processedPath: input.processedPath,
    requestId,
  });
  const unprocessedBytes = await readFile(getZooImagePath(input.unprocessedPath));
  const output = await postImageForBytes(
    "/remove-background",
    unprocessedBytes,
    path.basename(input.unprocessedPath),
    {
      "X-Request-Id": requestId,
      "X-Stuffed-Zoo-Animal-Id": input.animalId,
    },
  );
  console.info("Stuffed zoo background removal service completed", {
    animalId: input.animalId,
    requestId,
    inputBytes: unprocessedBytes.byteLength,
    outputBytes: output.byteLength,
    elapsedMs: Date.now() - startedAt,
  });
  await writeFile(getZooImagePath(input.processedPath), output);
  console.info("Stuffed zoo background removal image written", {
    animalId: input.animalId,
    requestId,
    processedPath: input.processedPath,
  });
  await markBackgroundRemovalCompleted(
    input.animalId,
    input.processedPath,
    backgroundRemovalVersion,
  );
  console.info("Stuffed zoo background removal completed", {
    animalId: input.animalId,
    requestId,
    elapsedMs: Date.now() - startedAt,
  });
  await logBackgroundRemovalBacklog("after completion");
};

const logBackgroundRemovalBacklog = async (label: string) => {
  try {
    const candidates = await getBackgroundRemovalRetryCandidates(backgroundRemovalVersion);
    console.info(`Stuffed zoo background removal backlog ${label}`, {
      count: candidates.length,
      failed: candidates.filter((candidate) => candidate.previousStatus === "failed").length,
      pending: candidates.filter((candidate) => candidate.previousStatus === "pending").length,
      stale: candidates.filter(
        (candidate) =>
          candidate.previousStatus === "completed" &&
          candidate.previousVersion !== backgroundRemovalVersion,
      ).length,
    });
  } catch (error) {
    console.error("Stuffed zoo background removal backlog check failed", { label, error });
  }
};

const hasClientReadyUnprocessedImage = async (unprocessedPath: string) =>
  unprocessedPath.startsWith("images/unprocessed/") &&
  path.extname(unprocessedPath).toLowerCase() === ".webp" &&
  (await fileExists(getZooImagePath(unprocessedPath)));

const fileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};
