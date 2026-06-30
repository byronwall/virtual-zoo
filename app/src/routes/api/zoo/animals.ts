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

const imageUrl = (path: string) => `/api/zoo/images/${path}`;

const toClientAnimal = (animal: Awaited<ReturnType<typeof getZooSnapshot>>["animals"][number]) => ({
  ...animal,
  image: {
    ...animal.image,
    displayUrl: imageUrl(animal.image.displayPath),
    stickerUrl: imageUrl(animal.image.processedPath ?? animal.image.displayPath),
  },
});

export async function GET(event: APIEvent) {
  requireZooPasscode(event);
  const snapshot = await getZooSnapshot();
  return Response.json({
    ...snapshot,
    animals: snapshot.animals.map(toClientAnimal),
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
