import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_ICON_VARIANT,
  DEFAULT_SITE_PRIMARY_COLOR,
  DEFAULT_SITE_SHORT_TITLE,
  DEFAULT_SITE_TITLE,
  resolveSiteConfig,
} from "./site-config";

describe("resolveSiteConfig", () => {
  it("keeps the current site defaults when env values are missing", () => {
    expect(resolveSiteConfig()).toMatchObject({
      iconVariant: DEFAULT_SITE_ICON_VARIANT,
      primaryColor: DEFAULT_SITE_PRIMARY_COLOR,
      shortTitle: DEFAULT_SITE_SHORT_TITLE,
      title: DEFAULT_SITE_TITLE,
    });
  });

  it("unescapes quote escapes from deployment env text", () => {
    expect(
      resolveSiteConfig({
        SITE_SHORT_TITLE: String.raw`Xavier\'s Zoo`,
        SITE_TITLE: String.raw`Xavier\'s Stuffed Animal Zoo`,
      }),
    ).toMatchObject({
      shortTitle: "Xavier's Zoo",
      title: "Xavier's Stuffed Animal Zoo",
    });
  });
});
