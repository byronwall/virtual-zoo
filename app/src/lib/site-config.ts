import { css } from "styled-system/css";

export const DEFAULT_SITE_TITLE = "Violet's Stuffed Animal Zoo";
export const DEFAULT_SITE_SHORT_TITLE = "Violet's Zoo";
export const DEFAULT_SITE_PRIMARY_COLOR = "orange";
export const DEFAULT_SITE_ICON_VARIANT = "default";

const sitePrimaryColors = ["orange", "blue", "green", "grass", "amber", "red"] as const;
const siteIconVariants = ["default", "a", "b", "c"] as const;

export type SitePrimaryColor = (typeof sitePrimaryColors)[number];
export type SiteIconVariant = (typeof siteIconVariants)[number];

export type SiteConfig = {
  title: string;
  shortTitle: string;
  primaryColor: SitePrimaryColor;
  iconVariant: SiteIconVariant;
  iconBasePath: string;
  themeColor: string;
};

type SiteEnv = {
  SITE_TITLE?: string;
  SITE_SHORT_TITLE?: string;
  SITE_PRIMARY_COLOR?: string;
  SITE_ICON_VARIANT?: string;
};

const primaryColorSet = new Set<string>(sitePrimaryColors);
const iconVariantSet = new Set<string>(siteIconVariants);

const themeColorByPrimaryColor: Record<SitePrimaryColor, string> = {
  amber: "#ffc53d",
  blue: "#0090ff",
  grass: "#46a758",
  green: "#30a46c",
  orange: "#f76b15",
  red: "#e5484d",
};

const paletteClassByPrimaryColor: Record<SitePrimaryColor, string> = {
  amber: css({ colorPalette: "amber" }),
  blue: css({ colorPalette: "blue" }),
  grass: css({ colorPalette: "grass" }),
  green: css({ colorPalette: "green" }),
  orange: css({ colorPalette: "orange" }),
  red: css({ colorPalette: "red" }),
};

const trimEnv = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parseTextEnv = (value: string | undefined, fallback: string) =>
  trimEnv(value)?.replace(/\\(['"])/g, "$1") ?? fallback;

const parsePrimaryColor = (value: string | undefined): SitePrimaryColor => {
  const normalized = trimEnv(value)?.toLowerCase();
  return normalized && primaryColorSet.has(normalized)
    ? (normalized as SitePrimaryColor)
    : DEFAULT_SITE_PRIMARY_COLOR;
};

const parseIconVariant = (value: string | undefined): SiteIconVariant => {
  const normalized = trimEnv(value)?.toLowerCase();
  return normalized && iconVariantSet.has(normalized)
    ? (normalized as SiteIconVariant)
    : DEFAULT_SITE_ICON_VARIANT;
};

export const resolveSiteConfig = (env: SiteEnv = {}): SiteConfig => {
  const title = parseTextEnv(env.SITE_TITLE, DEFAULT_SITE_TITLE);
  const shortTitle = parseTextEnv(env.SITE_SHORT_TITLE, DEFAULT_SITE_SHORT_TITLE);
  const primaryColor = parsePrimaryColor(env.SITE_PRIMARY_COLOR);
  const iconVariant = parseIconVariant(env.SITE_ICON_VARIANT);

  return {
    title,
    shortTitle,
    primaryColor,
    iconVariant,
    iconBasePath:
      iconVariant === "b" || iconVariant === "c" ? `/favicons/${iconVariant}` : "",
    themeColor: themeColorByPrimaryColor[primaryColor],
  };
};

export const getServerSiteConfig = () =>
  resolveSiteConfig({
    SITE_ICON_VARIANT: process.env.SITE_ICON_VARIANT,
    SITE_PRIMARY_COLOR: process.env.SITE_PRIMARY_COLOR,
    SITE_SHORT_TITLE: process.env.SITE_SHORT_TITLE,
    SITE_TITLE: process.env.SITE_TITLE,
  });

export const getClientSiteConfig = () =>
  typeof window === "undefined" || !window.__SITE_CONFIG__
    ? resolveSiteConfig()
    : window.__SITE_CONFIG__;

export const getSiteConfig = () =>
  typeof window === "undefined" ? getServerSiteConfig() : getClientSiteConfig();

export const getSitePaletteClass = (primaryColor: SitePrimaryColor) =>
  paletteClassByPrimaryColor[primaryColor];

export const getSiteIconHref = (
  config: Pick<SiteConfig, "iconBasePath">,
  fileName: string,
) => `${config.iconBasePath}/${fileName}`;
