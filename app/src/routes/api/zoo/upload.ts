import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { writeFile } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import {
  createUnprocessedImage,
  queueBackgroundRemoval,
} from "~/lib/stuffed-zoo/image-processing";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import {
  addAnimal,
  ensureZooDirs,
  getProcessedPath,
  getUnprocessedPath,
  getZooImagePath,
} from "~/lib/stuffed-zoo/store";

const cleanType = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim().toLowerCase();

const cleanText = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const imageVersion = (animal: Awaited<ReturnType<typeof addAnimal>>) =>
  encodeURIComponent(
    [
      animal.image.backgroundRemovalVersion,
      animal.image.backgroundRemovalStatus,
    ]
      .filter(Boolean)
      .join("-"),
  );

const imageUrl = (path: string, animal: Awaited<ReturnType<typeof addAnimal>>) =>
  `/api/zoo/images/${path}?v=${imageVersion(animal)}`;

const extensionForUpload = (file: File) => {
  const fromName = extname(file.name).toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/heic") return ".heic";
  if (file.type === "image/heif") return ".heif";
  if (file.type === "image/png") return ".png";
  return ".jpg";
};

const toClientAnimal = (animal: Awaited<ReturnType<typeof addAnimal>>) => {
  const visiblePath =
    animal.image.backgroundRemoved && animal.image.processedPath
      ? animal.image.processedPath
      : animal.image.unprocessedPath;
  return {
    id: animal.id,
    name: animal.name,
    type: animal.type,
    notes: animal.notes,
    canvas: animal.canvas,
    sleepLog: animal.sleepLog,
    createdAt: animal.createdAt,
    updatedAt: animal.updatedAt,
    image: {
      backgroundRemoved: animal.image.backgroundRemoved,
      backgroundRemovalStatus: animal.image.backgroundRemovalStatus,
      backgroundRemovalVersion: animal.image.backgroundRemovalVersion,
      backgroundRemovalError: animal.image.backgroundRemovalError,
      imageUrl: imageUrl(visiblePath, animal),
    },
  };
};

export async function POST(event: APIEvent) {
  requireZooPasscode(event);
  const formData = await event.request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a stuffed animal photo." }, { status: 400 });
  }

  const name = cleanText(formData.get("name")) || "New friend";
  const type = cleanType(formData.get("type")) || "friend";
  const notes = cleanText(formData.get("notes"));
  const id = `upload_${randomUUID()}`;
  const originalPath = `images/original/${id}${extensionForUpload(file)}`;
  const unprocessedPath = getUnprocessedPath(id);
  const processedPath = getProcessedPath(unprocessedPath);
  const bytes = Buffer.from(await file.arrayBuffer());

  await ensureZooDirs();
  await writeFile(getZooImagePath(originalPath), bytes);

  let unprocessedBytes: Buffer;
  try {
    unprocessedBytes = await createUnprocessedImage({ bytes, filename: file.name || originalPath });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The image helper could not create that WebP.",
      },
      { status: 502 },
    );
  }

  await writeFile(getZooImagePath(unprocessedPath), unprocessedBytes);

  const animal = await addAnimal({
    name,
    type,
    notes,
    originalPath,
    unprocessedPath,
    backgroundRemovalStatus: "pending",
  });
  queueBackgroundRemoval({ animalId: animal.id, unprocessedPath, processedPath });

  return Response.json({ animal: toClientAnimal(animal) }, { status: 201 });
}
