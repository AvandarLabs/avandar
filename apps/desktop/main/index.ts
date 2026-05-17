import { join } from "node:path";
import { app, BrowserWindow, PATHS } from "electrobun";
import { resolveWebviewUrl } from "./config/url";
import { setupApplicationMenu } from "./menu/setupApplicationMenu";

const APP_NAME = "Avandar";

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

const mainWindow = new BrowserWindow({
  title: APP_NAME,
  url,
  frame: { x: 0, y: 0, width: 1280, height: 800 },
  preload,
  titleBarStyle: "hiddenInset",
});

// `apps/desktop/preload/index.ts` sets `window.__AVA_PLATFORM__` but
// Electrobun injects that preload into a webkit isolated content world, so
// React (running in the page main world) cannot see it. Re-publish the
// signal into the page main world here via `evaluateJavaScript`, which
// WKWebView defaults to the main world. Platform-aware UI then reads it
// from `<html data-ava-platform>` (see `shared/platform/isDesktop.ts`).
mainWindow.webview.on("dom-ready", () => {
  mainWindow.webview.executeJavascript(
    `document.documentElement.dataset.avaPlatform = "desktop";`,
  );
});

setupApplicationMenu(APP_NAME, mainWindow);

console.log(`[avandar-desktop] webview loaded ${url}`);

void app;
