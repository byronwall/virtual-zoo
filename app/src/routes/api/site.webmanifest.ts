import type { APIEvent } from "@solidjs/start/server";
import { getServerSiteConfig, getSiteIconHref } from "~/lib/site-config";

export function GET(_event: APIEvent) {
  const siteConfig = getServerSiteConfig();

  return Response.json(
    {
      name: siteConfig.title,
      short_name: siteConfig.shortTitle,
      icons: [
        {
          src: getSiteIconHref(siteConfig, "android-chrome-192x192.png"),
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: getSiteIconHref(siteConfig, "android-chrome-512x512.png"),
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      theme_color: siteConfig.themeColor,
      background_color: "#ffffff",
      display: "standalone",
    },
    {
      headers: {
        "content-type": "application/manifest+json",
      },
    },
  );
}
