import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { writeFile } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import {
  createDisplayImage,
  createThumbnailImage,
  queueBackgroundRemoval,
} from "~/lib/stuffed-zoo/image-processing";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import {
  addAnimal,
  ensureZooDirs,
  getThumbnailPath,
  getZooImagePath,
  zooImageExists,
} from "~/lib/stuffed-zoo/store";

const cleanType = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim().toLowerCase();

const cleanText = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const extensionForUpload = (file: File) => {
  const fromName = extname(file.name).toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/heic") return ".heic";
  if (file.type === "image/heif") return ".heif";
  if (file.type === "image/png") return ".png";
  return ".jpg";
};

const toClientAnimal = async (animal: Awaited<ReturnType<typeof addAnimal>>) => {
  const thumbnailPath = getThumbnailPath(animal.image.displayPath);
  const stickerPath = animal.image.processedPath ?? animal.image.displayPath;
  const thumbnailUrl = `/api/zoo/images/${
    (await zooImageExists(thumbnailPath)) ? thumbnailPath : stickerPath
  }`;
  return {
    ...animal,
    image: {
      ...animal.image,
      displayUrl: `/api/zoo/images/${animal.image.displayPath}`,
      thumbnailUrl,
      stickerUrl: `/api/zoo/images/${stickerPath}`,
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
  const displayPath = `images/display/${id}.jpg`;
  const processedPath = `images/processed/${id}.png`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await ensureZooDirs();
  await writeFile(getZooImagePath(originalPath), bytes);

  let displayBytes: Buffer;
  try {
    displayBytes = await createDisplayImage({ bytes, filename: file.name || originalPath });
  } catch (error) {
    if (file.type !== "image/heic" && file.type !== "image/heif") {
      displayBytes = bytes;
    } else {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "The image helper could not convert that iPad photo.",
        },
        { status: 502 },
      );
    }
  }

  await writeFile(getZooImagePath(displayPath), displayBytes);
  const thumbnailBytes = await createThumbnailImage({
    bytes: displayBytes,
    filename: displayPath,
  });
  if (thumbnailBytes) {
    await writeFile(getZooImagePath(getThumbnailPath(displayPath)), thumbnailBytes);
  }

  const animal = await addAnimal({
    name,
    type,
    notes,
    originalPath,
    displayPath,
    backgroundRemovalStatus: "pending",
  });
  queueBackgroundRemoval({ animalId: animal.id, displayPath, processedPath });

  return Response.json({ animal: await toClientAnimal(animal) }, { status: 201 });
}
