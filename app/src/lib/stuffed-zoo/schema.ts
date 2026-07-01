import { z } from "zod";

export const backgroundRemovalStatusSchema = z.enum([
  "not_configured",
  "pending",
  "completed",
  "failed",
]);

export const sleepLogEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.literal("sleepover-button"),
});

export const animalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  notes: z.string(),
  image: z.object({
    originalPath: z.string().min(1),
    displayPath: z.string().min(1),
    processedPath: z.string().optional(),
    backgroundRemoved: z.boolean(),
    backgroundRemovalStatus: backgroundRemovalStatusSchema,
    backgroundRemovalVersion: z.string().optional(),
    backgroundRemovalError: z.string().optional(),
  }),
  canvas: z.object({
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
    scale: z.number(),
    zIndex: z.number(),
  }),
  sleepLog: z.array(sleepLogEntrySchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const zooStoreSchema = z.object({
  version: z.literal(1),
  animals: z.array(animalSchema),
  customTypes: z.array(z.string().min(1)),
});

export const updateAnimalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  notes: z.string(),
});

export const updateAnimalPositionSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  zIndex: z.number(),
});

export const loginSchema = z.object({
  passcode: z.string(),
});

export type Animal = z.infer<typeof animalSchema>;
export type BackgroundRemovalStatus = z.infer<typeof backgroundRemovalStatusSchema>;
export type SleepLogEntry = z.infer<typeof sleepLogEntrySchema>;
export type ZooStore = z.infer<typeof zooStoreSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
export type UpdateAnimalPositionInput = z.infer<typeof updateAnimalPositionSchema>;
