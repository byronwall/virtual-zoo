import { defineConfig } from "@solidjs/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

const basePath = process.env.BASE_PATH?.trim();
const normalizedBasePath =
  !basePath || basePath === "/"
    ? "/"
    : `/${basePath.replace(/^\/+|\/+$/g, "")}/`;

export default defineConfig({
  server: {
    baseURL: normalizedBasePath,
    plugins: ["./src/server/stuffed-zoo-recovery.ts"],
  },
  vite: {
    plugins: [lucidePreprocess(), tsconfigPaths()],
  },
});
