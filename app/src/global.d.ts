/// <reference types="@solidjs/start/env" />

import type { SiteConfig } from "./lib/site-config";

declare global {
  interface Window {
    __SITE_CONFIG__?: SiteConfig;
  }
}
