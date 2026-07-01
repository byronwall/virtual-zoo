// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import {
  getServerSiteConfig,
  getSiteIconHref,
  getSitePaletteClass,
} from "./lib/site-config";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => {
      const siteConfig = getServerSiteConfig();
      const serializedSiteConfig = JSON.stringify(siteConfig).replace(
        /</g,
        "\\u003c",
      );

      return (
      <html lang="en" class={getSitePaletteClass(siteConfig.primaryColor)}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="application-name" content={siteConfig.shortTitle} />
          <meta name="apple-mobile-web-app-title" content={siteConfig.shortTitle} />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="theme-color" content={siteConfig.themeColor} />
          <link rel="icon" href={getSiteIconHref(siteConfig, "favicon.ico")} sizes="any" />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href={getSiteIconHref(siteConfig, "favicon-32x32.png")}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href={getSiteIconHref(siteConfig, "favicon-16x16.png")}
          />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href={getSiteIconHref(siteConfig, "apple-touch-icon.png")}
          />
          <link rel="manifest" href="/api/site.webmanifest" />
          <script
            innerHTML={`window.__SITE_CONFIG__=${serializedSiteConfig};`}
          />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
      );
    }}
  />
));
