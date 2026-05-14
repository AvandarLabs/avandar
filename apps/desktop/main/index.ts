import { join } from "node:path";
import { app, BrowserWindow, PATHS } from "electrobun";
import { resolveWebviewUrl } from "./config/url";

const mode = (process.env.AVA_DESKTOP_MODE ?? "development") as
  | "development"
  | "production";

const viteDevUrl = process.env.AVA_VITE_DEV_URL ?? "http://localhost:5173";

const bundledIndexPath =
  process.env.AVA_BUNDLED_INDEX_PATH ??
  join(PATHS.RESOURCES_FOLDER, "app", "web", "index.html");

const url = resolveWebviewUrl({ mode, viteDevUrl, bundledIndexPath });

const preload =
  process.env.AVA_PRELOAD_PATH ??
  join(PATHS.RESOURCES_FOLDER, "app", "views", "preload", "index.js");

new BrowserWindow({
  title: "Avandar",
  url,
  frame: { x: 0, y: 0, width: 1280, height: 800 },
  preload,
});

console.log(`[avandar-desktop] webview loaded ${url}`);

void app;
