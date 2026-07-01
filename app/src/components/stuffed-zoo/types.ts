import type { Animal } from "~/lib/stuffed-zoo/schema";

export type ClientAnimal = Omit<Animal, "image"> & {
  image: {
    backgroundRemoved: boolean;
    backgroundRemovalStatus: Animal["image"]["backgroundRemovalStatus"];
    backgroundRemovalVersion?: string;
    backgroundRemovalError?: string;
    imageUrl: string;
  };
};

export type ZooSnapshot = {
  version: 1;
  animals: ClientAnimal[];
  customTypes: string[];
};
