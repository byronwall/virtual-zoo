import type { APIEvent } from "@solidjs/start/server";
import {
  ensureBackgroundRemovalRecoveryStarted,
  ensureSnapshotThumbnails,
} from "~/lib/stuffed-zoo/image-processing";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import {
  deleteAnimal,
  getThumbnailPath,
  getZooSnapshot,
  logSleepoverLastNight,
  updateAnimal,
  updateAnimalPosition,
  zooImageExists,
} from "~/lib/stuffed-zoo/store";
import { updateAnimalPositionSchema, updateAnimalSchema } from "~/lib/stuffed-zoo/schema";

const imageUrl = (path: string) => `/api/zoo/images/${path}`;

const toClientAnimal = async (
  animal: Awaited<ReturnType<typeof getZooSnapshot>>["animals"][number],
) => {
  const thumbnailPath = getThumbnailPath(animal.image.displayPath);
  const stickerPath = animal.image.processedPath ?? animal.image.displayPath;
  const thumbnailPathOrSticker =
    animal.image.backgroundRemoved && animal.image.processedPath
      ? animal.image.processedPath
      : (await zooImageExists(thumbnailPath))
        ? thumbnailPath
        : stickerPath;
  return {
    ...animal,
    image: {
      ...animal.image,
      displayUrl: imageUrl(animal.image.displayPath),
      thumbnailUrl: imageUrl(thumbnailPathOrSticker),
      stickerUrl: imageUrl(stickerPath),
    },
  };
};

export async function GET(event: APIEvent) {
  requireZooPasscode(event);
  ensureBackgroundRemovalRecoveryStarted();
  const snapshot = await getZooSnapshot();
  await ensureSnapshotThumbnails(snapshot);
  const animals = await Promise.all(snapshot.animals.map(toClientAnimal));
  return Response.json({
    ...snapshot,
    animals,
  });
}

export async function PATCH(event: APIEvent) {
  requireZooPasscode(event);
  const input = (await event.request.json().catch(() => ({}))) as { intent?: string };
  if (input.intent === "position") {
    const animal = await updateAnimalPosition(updateAnimalPositionSchema.parse(input));
    return Response.json({ animal: await toClientAnimal(animal) });
  }
  if (input.intent === "sleepover") {
    const id = String((input as { id?: unknown }).id ?? "");
    const result = await logSleepoverLastNight(id);
    return Response.json({
      ...result,
      animal: await toClientAnimal(result.animal),
    });
  }
  const animal = await updateAnimal(updateAnimalSchema.parse(input));
  return Response.json({ animal: await toClientAnimal(animal) });
}

export async function DELETE(event: APIEvent) {
  requireZooPasscode(event);
  const input = (await event.request.json().catch(() => ({}))) as { id?: unknown };
  await deleteAnimal(String(input.id ?? ""));
  return Response.json({ ok: true });
}
