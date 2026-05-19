import { join } from "node:path";
import { app, BrowserWindow, PATHS } from "electrobun";
import { SYNCABLE_TABLES } from "../sync/syncable-tables";
import { resolveMigrationsDir } from "./config/resolveMigrationsDir/resolveMigrationsDir";
import { resolveWebviewUrl } from "./config/url";
import { setupApplicationMenu } from "./menu/setupApplicationMenu";
import { getUserDataDir } from "./platform/getUserDataDir";
import { createDuckDbService } from "./services/createDuckDbService/createDuckDbService";
import { createWhisperService } from "./services/createWhisperService/createWhisperService";
import { loadMigrationsFromDir } from "./services/loadMigrations/loadMigrations";
import { bootstrapSnapshotIfNeeded } from "./services/SnapshotBootstrap/SnapshotBootstrap";
import {
  openSqliteDatabase,
  runMigrations,
} from "./services/SqliteService/Sqlite";
import { createSupabaseRestClient } from "./services/SupabaseRest";

const APP_NAME = "Avandar";

const mode = (process.env.AVA_DESKTOP_MODE ?? "development") as
  | "development"
  | "production";

const viteDevUrl = process.env.AVA_VITE_DEV_URL ?? "http://localhost:5173";

const bundledIndexPath =
  process.env.AVA_BUNDLED_INDEX_PATH ??
  join(PATHS.RESOURCES_FOLDER, "app", "web", "index.html");

const url = resolveWebviewUrl({ mode, viteDevUrl, bundledIndexPath });

// Open the local metadata database and apply any pending migrations
// before the webview gets a chance to read from it. Failure to open or
// migrate is fatal: the webview's CRUD layer assumes a ready schema.
const userDataDir = getUserDataDir();
const sqlitePath =
  process.env.AVA_SQLITE_PATH ?? join(userDataDir, "metadata.sqlite");

const migrationsDir = resolveMigrationsDir({
  mode,
  mainDir: import.meta.dirname,
  resourcesFolder: PATHS.RESOURCES_FOLDER,
  override: process.env.AVA_MIGRATIONS_DIR,
});

const sqliteDb = openSqliteDatabase(sqlitePath);
const migrations = loadMigrationsFromDir(migrationsDir);
runMigrations(sqliteDb, migrations);

console.log(
  `[avandar-desktop] sqlite ready at ${sqlitePath} ` +
    `(${migrations.length} migration(s) on disk)`,
);

// Open the native DuckDB instance eagerly. A failed dlopen of the
// `duckdb` Node binding here takes the app down at boot rather than on
// the first analytical query, which is what we want: the desktop shell
// has no wasm fallback. Soon, the IPC handler registration that exposes
// this service to the webview will land alongside the same wiring that
// registers the RDB handlers - register here once `createIpcServer(...)`
// is wired against Electrobun's webview transport.
const duckdbPath =
  process.env.AVA_DUCKDB_PATH ?? join(userDataDir, "duckdb", "ava.duckdb");
const duckdbSvc = createDuckDbService(duckdbPath);

console.log(`[avandar-desktop] duckdb ready at ${duckdbPath}`);

// Native Whisper service. Model weights live on disk under
// `<userData>/whisper-models/` so the user can download the larger
// (multi-GB) ggml models once and run fully offline thereafter. The
// `smart-whisper` native binding is loaded lazily on first download or
// transcribe call so a missing prebuild doesn't take the app down at
// boot — voice is an optional feature and the rest of the shell should
// stay functional without it.
const whisperModelsDir =
  process.env.AVA_WHISPER_MODELS_DIR ??
  join(userDataDir, "whisper-models");
const whisperSvc = createWhisperService({ modelsDir: whisperModelsDir });

console.log(`[avandar-desktop] whisper models dir: ${whisperModelsDir}`);

// Stopgap snapshot bootstrap: when a dev token + Supabase URL/key are
// configured, pull every syncable table from Supabase REST into the
// local mirror on first launch. Soon, the real bootstrap will fire
// once the user signs in (driven by the keychain auth work).
const devToken = process.env.AVA_DEV_ACCESS_TOKEN;
const supabaseUrl = process.env.VITE_SUPABASE_API_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (devToken && supabaseUrl && supabaseAnonKey) {
  try {
    await bootstrapSnapshotIfNeeded({
      db: sqliteDb,
      rest: createSupabaseRestClient(),
      accessToken: devToken,
      tables: SYNCABLE_TABLES,
      logger: { log: console.log, error: console.error },
    });
  } catch (err) {
    // Bootstrap failures are non-fatal: the webview still loads
    // against whatever is in SQLite. Logged so dev can investigate.
    console.error("[snapshot-bootstrap] failed:", err);
  }
} else {
  console.log(
    "[snapshot-bootstrap] skipped (set AVA_DEV_ACCESS_TOKEN + " +
      "VITE_SUPABASE_API_URL + VITE_SUPABASE_ANON_KEY to enable)",
  );
}

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

// Close the native DuckDB connection cleanly on app quit. The OS would
// close the file handle on process exit either way, but releasing the
// connection lets DuckDB flush its WAL and avoid an "unclean shutdown"
// note on the next open. SQLite gets the same treatment for symmetry
// once a teardown hook lands.
app.on("beforeQuit", () => {
  duckdbSvc.close().catch((err: unknown) => {
    console.error("[avandar-desktop] duckdb close failed:", err);
  });
  whisperSvc.close().catch((err: unknown) => {
    console.error("[avandar-desktop] whisper close failed:", err);
  });
});
