import type { APIEvent } from "@solidjs/start/server";
import { requireZooPasscode } from "~/lib/stuffed-zoo/passcode";
import {
  deleteAnimal,
  getZooSnapshot,
  logSleepoverLastNight,
  updateAnimal,
  updateAnimalPosition,
} from "~/lib/stuffed-zoo/store";
import { updateAnimalPositionSchema, updateAnimalSchema } from "~/lib/stuffed-zoo/schema";

const imageVersion = (
  animal: Awaited<ReturnType<typeof getZooSnapshot>>["animals"][number],
) =>
  encodeURIComponent(
    [
      animal.image.backgroundRemovalVersion,
      animal.image.backgroundRemovalStatus,
    ]
      .filter(Boolean)
      .join("-"),
  );

const imageUrl = (
  path: string,
  animal: Awaited<ReturnType<typeof getZooSnapshot>>["animals"][number],
) => `/api/zoo/images/${path}?v=${imageVersion(animal)}`;

const toClientAnimal = (
  animal: Awaited<ReturnType<typeof getZooSnapshot>>["animals"][number],
) => {
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

export async function GET(event: APIEvent) {
  requireZooPasscode(event);
  const snapshot = await getZooSnapshot();
  const animals = snapshot.animals.map(toClientAnimal);
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
    return Response.json({ animal: toClientAnimal(animal) });
  }
  if (input.intent === "sleepover") {
    const id = String((input as { id?: unknown }).id ?? "");
    const result = await logSleepoverLastNight(id);
    return Response.json({
      ...result,
      animal: toClientAnimal(result.animal),
    });
  }
  const animal = await updateAnimal(updateAnimalSchema.parse(input));
  return Response.json({ animal: toClientAnimal(animal) });
}

export async function DELETE(event: APIEvent) {
  requireZooPasscode(event);
  const input = (await event.request.json().catch(() => ({}))) as { id?: unknown };
  await deleteAnimal(String(input.id ?? ""));
  return Response.json({ ok: true });
}
