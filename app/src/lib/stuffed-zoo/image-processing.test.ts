import { afterEach, describe, expect, it, vi } from "vitest";
import { isBackgroundRemovalEnabled } from "./image-processing";

describe("isBackgroundRemovalEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips background removal in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BACKGROUND_REMOVAL_PROVIDER", "rembg");
    vi.stubEnv("BACKGROUND_REMOVAL_IN_DEV", "");

    expect(isBackgroundRemovalEnabled()).toBe(false);
  });

  it("allows dedicated background-removal checks to opt in during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BACKGROUND_REMOVAL_PROVIDER", "rembg");
    vi.stubEnv("BACKGROUND_REMOVAL_IN_DEV", "true");

    expect(isBackgroundRemovalEnabled()).toBe(true);
  });

  it("keeps background removal enabled by default outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKGROUND_REMOVAL_PROVIDER", "rembg");

    expect(isBackgroundRemovalEnabled()).toBe(true);
  });

  it("honors a disabled background-removal provider", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKGROUND_REMOVAL_PROVIDER", "none");

    expect(isBackgroundRemovalEnabled()).toBe(false);
  });
});
