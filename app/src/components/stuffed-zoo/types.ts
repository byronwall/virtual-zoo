import type { Animal } from "~/lib/stuffed-zoo/schema";

export type ClientAnimal = Animal & {
  image: Animal["image"] & {
    displayUrl: string;
    stickerUrl: string;
  };
};

export type ZooSnapshot = {
  version: 1;
  animals: ClientAnimal[];
  customTypes: string[];
};
