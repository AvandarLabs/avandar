import { app, BrowserWindow, PATHS } from "electrobun";
import { join } from "node:path";

import { SYNCABLE_TABLES } from "../sync/syncable-tables";
import { resolveMigrationsDir } from "./config/resolveMigrationsDir/resolveMigrationsDir";
import { resolveWebviewUrl } from "./config/url";
import { createElectrobunIpcTransport } from "./ipc/createElectrobunIpcTransport/createElectrobunIpcTransport";
import { createIpcServer } from "./ipc/createIpcServer/createIpcServer";
import { DESKTOP_IPC_BRIDGE_SCRIPT } from "./ipc/desktopIpcBridgeScript/desktopIpcBridgeScript";
import {
  createAuthState,
  registerAuthHandlers,
} from "./ipc/registerAuthHandlers/registerAuthHandlers";
import { registerDatasetBlobHandlers } from "./ipc/registerDatasetBlobHandlers/registerDatasetBlobHandlers";
import { registerDuckDbHandlers } from "./ipc/registerDuckDbHandlers/registerDuckDbHandlers";
import { registerRdbHandlers } from "./ipc/registerRdbHandlers/registerRdbHandlers";
import { registerServerApiHandlers } from "./ipc/registerServerApiHandlers/registerServerApiHandlers";
import { setupApplicationMenu } from "./menu/setupApplicationMenu";
import { getUserDataDir } from "./platform/getUserDataDir";
import { createDuckDbService } from "./services/createDuckDbService/createDuckDbService";
import { createFileSystemDatasetBlobStore } from "./services/createFileSystemDatasetBlobStore/createFileSystemDatasetBlobStore";
import { createKeychain } from "./services/createKeychain/createKeychain";
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

const viteDevUrl = process.env.AVA_VITE_DEV_URL ?? "http://127.0.0.1:5173";

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
// has no wasm fallback.
const duckdbPath =
  process.env.AVA_DUCKDB_PATH ?? join(userDataDir, "duckdb", "ava.duckdb");
const duckdbSvc = createDuckDbService(duckdbPath);

console.log(`[avandar-desktop] duckdb ready at ${duckdbPath}`);

// Construct the rest of the native services. Boot fails fast if any of
// them can't initialise (keychain unsupported platform, blob root not
// writable, etc.) so the webview never sees a half-wired IPC surface.
const keychain = createKeychain();
const datasetBlobStore = createFileSystemDatasetBlobStore(
  join(userDataDir, "blobs"),
);
const authState = createAuthState();

console.log(`[avandar-desktop] keychain + blob store ready`);

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
//
// On the same `dom-ready` tick we also inject the IPC bridge shim so
// `window.electrobun = { send, once }` exists by the time React's
// `callIpc(...)` fires. The shim relays messages through DOM
// `CustomEvent`s to the preload world, which forwards them via the
// Electrobun RPC stream the bun-main `ipcTransport` listens to.
mainWindow.webview.on("dom-ready", () => {
  mainWindow.webview.executeJavascript(
    `document.documentElement.dataset.avaPlatform = "desktop";`,
  );
  mainWindow.webview.executeJavascript(DESKTOP_IPC_BRIDGE_SCRIPT);
});

// Wire the IPC server against the webview's RPC stream. All
// channel-keyed handlers register against the same server; the
// transport multiplexes per-channel messages over Electrobun's single
// underlying RPC pipe.
const ipcTransport = createElectrobunIpcTransport(mainWindow.webview);
const ipcServer = createIpcServer(ipcTransport);

registerRdbHandlers(ipcServer, sqliteDb);
registerDuckDbHandlers(ipcServer, duckdbSvc);
registerAuthHandlers(ipcServer, keychain, authState, {
  // After the user signs in successfully (Bun-main has just exchanged
  // credentials for an access token), seed the local SQLite mirror from
  // Supabase for any table that's still empty. Subsequent launches:
  // online or offline: read from the same local rows without a
  // network round-trip. Failures are non-fatal; the webview will still
  // load and show whatever's in SQLite.
  onAuthenticated: async (accessToken) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log(
        "[snapshot-bootstrap] post-signin skipped: Supabase env missing",
      );
      return;
    }
    try {
      await bootstrapSnapshotIfNeeded({
        db: sqliteDb,
        rest: createSupabaseRestClient(),
        accessToken,
        tables: SYNCABLE_TABLES,
        logger: { log: console.log, error: console.error },
      });
    } catch (err) {
      console.error("[snapshot-bootstrap] post-signin failed:", err);
    }
  },
});
registerDatasetBlobHandlers(ipcServer, datasetBlobStore);
registerServerApiHandlers(ipcServer, {
  supabaseUrl: process.env.VITE_SUPABASE_API_URL ?? "",
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
  authState,
});

console.log(`[avandar-desktop] ipc handlers registered`);

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
});
