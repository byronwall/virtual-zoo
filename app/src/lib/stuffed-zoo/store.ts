import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  animalSchema,
  type Animal,
  type UpdateAnimalInput,
  type UpdateAnimalPositionInput,
  type ZooStore,
  zooStoreSchema,
} from "./schema";

const defaultTypes = ["cat", "dog", "axolotl"];
let writeQueue = Promise.resolve();

const nowIso = () => new Date().toISOString();

const getWorkspaceRoot = () => {
  const cwd = process.cwd();
  return path.basename(cwd) === "app" ? path.dirname(cwd) : cwd;
};

const getAppRoot = () => path.join(getWorkspaceRoot(), "app");

export const getRuntimeDataDir = () => {
  const configured = process.env.APP_DATA_DIR?.trim();
  if (!configured) return path.join(getAppRoot(), "data");
  return path.isAbsolute(configured)
    ? configured
    : path.join(getWorkspaceRoot(), configured);
};

export const getZooDataDir = () => path.join(getRuntimeDataDir(), "stuffed-zoo");
export const getZooImagePath = (relativePath: string) =>
  path.join(getZooDataDir(), relativePath);

const getStorePath = () => path.join(getZooDataDir(), "animals.json");

const emptyStore = (): ZooStore => ({
  version: 1,
  animals: [],
  customTypes: defaultTypes,
});

const fileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

export const zooImageExists = (relativePath: string) =>
  fileExists(getZooImagePath(relativePath));

export const ensureZooDirs = async () => {
  await Promise.all([
    mkdir(path.join(getZooDataDir(), "images", "original"), { recursive: true }),
    mkdir(path.join(getZooDataDir(), "images", "display"), { recursive: true }),
    mkdir(path.join(getZooDataDir(), "images", "thumbnails"), { recursive: true }),
    mkdir(path.join(getZooDataDir(), "images", "processed"), { recursive: true }),
  ]);
};

const readStore = async (): Promise<ZooStore> => {
  await ensureZooDirs();
  const storePath = getStorePath();
  if (!(await fileExists(storePath))) return emptyStore();
  const parsed = zooStoreSchema.safeParse(JSON.parse(await readFile(storePath, "utf8")));
  if (!parsed.success) throw new Error("The stuffed zoo data file is invalid.");
  return parsed.data;
};

const writeStore = async (store: ZooStore) => {
  await ensureZooDirs();
  const storePath = getStorePath();
  const tempPath = `${storePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tempPath, storePath);
};

const withWriteLock = async <T>(operation: (store: ZooStore) => Promise<T>) => {
  const run = async () => {
    const store = await readStore();
    const result = await operation(store);
    await writeStore(store);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

export const getZooSnapshot = async () => readStore();

export const getBackgroundRemovalRetryCandidates = async () => {
  const store = await readStore();
  return store.animals
    .filter(
      (animal) =>
        !animal.image.backgroundRemoved &&
        (animal.image.backgroundRemovalStatus === "pending" ||
          animal.image.backgroundRemovalStatus === "failed"),
    )
    .map((animal) => ({
      animalId: animal.id,
      displayPath: animal.image.displayPath,
      processedPath:
        animal.image.processedPath ??
        `images/processed/${path.basename(animal.image.displayPath, path.extname(animal.image.displayPath))}.png`,
      previousStatus: animal.image.backgroundRemovalStatus,
    }));
};

export const addAnimal = async (input: {
  name: string;
  type: string;
  notes: string;
  originalPath: string;
  displayPath: string;
  backgroundRemovalStatus: Animal["image"]["backgroundRemovalStatus"];
}) =>
  withWriteLock(async (store) => {
    const timestamp = nowIso();
    const zIndex =
      store.animals.reduce((highest, animal) => Math.max(highest, animal.canvas.zIndex), 0) + 1;
    const animal = animalSchema.parse({
      id: `animal_${randomUUID()}`,
      name: input.name,
      type: input.type,
      notes: input.notes,
      image: {
        originalPath: input.originalPath,
        displayPath: input.displayPath,
        backgroundRemoved: false,
        backgroundRemovalStatus: input.backgroundRemovalStatus,
      },
      canvas: randomCanvasPosition(zIndex),
      sleepLog: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    store.animals.push(animal);
    addCustomType(store, animal.type);
    return animal;
  });

const randomCanvasPosition = (zIndex: number) => ({
  x: Math.round(10 + Math.random() * 64),
  y: Math.round(8 + Math.random() * 64),
  rotation: Math.round(-9 + Math.random() * 18),
  scale: Number((0.86 + Math.random() * 0.2).toFixed(2)),
  zIndex,
});

const addCustomType = (store: ZooStore, type: string) => {
  const normalized = type.trim().toLowerCase();
  if (!normalized) return;
  if (!store.customTypes.includes(normalized)) store.customTypes.push(normalized);
};

export const updateAnimal = async (input: UpdateAnimalInput) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, input.id);
    animal.name = input.name.trim();
    animal.type = input.type.trim().toLowerCase();
    animal.notes = input.notes;
    animal.updatedAt = nowIso();
    addCustomType(store, animal.type);
    return animal;
  });

export const updateAnimalPosition = async (input: UpdateAnimalPositionInput) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, input.id);
    animal.canvas.x = input.x;
    animal.canvas.y = input.y;
    animal.canvas.zIndex = input.zIndex;
    animal.updatedAt = nowIso();
    return animal;
  });

export const logSleepoverLastNight = async (id: string) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, id);
    const date = yesterdayDate();
    const exists = animal.sleepLog.some((entry) => entry.date === date);
    if (!exists) {
      animal.sleepLog.push({ date, source: "sleepover-button" });
      animal.updatedAt = nowIso();
    }
    return { animal, date, added: !exists };
  });

export const deleteAnimal = async (id: string) =>
  withWriteLock(async (store) => {
    const index = store.animals.findIndex((animal) => animal.id === id);
    if (index === -1) throw new Error("Animal not found.");
    const [animal] = store.animals.splice(index, 1);
    await Promise.all(
      [
        animal.image.originalPath,
        animal.image.displayPath,
        getThumbnailPath(animal.image.displayPath),
        animal.image.processedPath,
      ]
        .filter((imagePath): imagePath is string => !!imagePath)
        .map((imagePath) => rm(getZooImagePath(imagePath), { force: true })),
    );
    return animal;
  });

export const markBackgroundRemovalCompleted = async (id: string, processedPath: string) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, id);
    animal.image.processedPath = processedPath;
    animal.image.backgroundRemoved = true;
    animal.image.backgroundRemovalStatus = "completed";
    delete animal.image.backgroundRemovalError;
    animal.updatedAt = nowIso();
    return animal;
  });

export const markBackgroundRemovalPending = async (id: string) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, id);
    animal.image.backgroundRemoved = false;
    animal.image.backgroundRemovalStatus = "pending";
    delete animal.image.backgroundRemovalError;
    animal.updatedAt = nowIso();
    return animal;
  });

export const markBackgroundRemovalFailed = async (id: string, error: string) =>
  withWriteLock(async (store) => {
    const animal = findAnimal(store, id);
    animal.image.backgroundRemovalStatus = "failed";
    animal.image.backgroundRemovalError = error.slice(0, 240);
    animal.updatedAt = nowIso();
    return animal;
  });

const findAnimal = (store: ZooStore, id: string) => {
  const animal = store.animals.find((candidate) => candidate.id === id);
  if (!animal) throw new Error("Animal not found.");
  return animal;
};

export const getThumbnailPath = (displayPath: string) =>
  `images/thumbnails/${path.basename(displayPath, path.extname(displayPath))}.webp`;

const yesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};
