import { join } from "node:path";

const APP_NAME = "Avandar";

/*
 * Inputs for the internal {@link _resolveUserDataDir} helper. Accepts
 * the host `platform`, the user's home directory, and the value of
 * `APPDATA` (Windows only). Keeping the inputs explicit lets the pure
 * helper be unit-tested across platform fixtures without mocking
 * `process` directly.
 */
type ResolveUserDataDirArgs = {
  platform: NodeJS.Platform | string;
  home: string;
  appdata: string | undefined;
};

/*
 * Pure resolver behind {@link getUserDataDir}. Not exported because the
 * runtime always wants the live-process variant; tests exercise this
 * indirectly by stubbing `process.platform` / `process.env` and calling
 * {@link getUserDataDir}.
 */
function _resolveUserDataDir(args: Readonly<ResolveUserDataDirArgs>): string {
  if (args.platform === "darwin") {
    return join(args.home, "Library", "Application Support", APP_NAME);
  }
  if (args.platform === "win32") {
    if (args.appdata === undefined || args.appdata === "") {
      throw new Error("APPDATA required on win32");
    }
    // Use string concatenation with the Windows separator so the path
    // round-trips regardless of the host OS running this code (Node's
    // `path.join` on macOS would emit forward slashes). Keeps the
    // resolver portable across CI hosts.
    return `${args.appdata}\\${APP_NAME}`;
  }
  throw new Error(`unsupported platform: ${args.platform}`);
}

/**
 * Returns the absolute per-OS-user application data directory for the
 * Avandar desktop shell. Reads `process.platform`, `process.env.HOME`
 * (or `USERPROFILE` on Windows), and `process.env.APPDATA` at call time.
 *
 * macOS returns `<home>/Library/Application Support/Avandar`; Windows
 * returns `<APPDATA>\Avandar`; every other platform throws.
 *
 * Use from `apps/desktop/main/index.ts` startup and from any Bun-main
 * service that needs to write under the user-data directory (SQLite,
 * DuckDB, blob store, keychain).
 *
 * @returns The absolute user-data directory for the current process.
 * @throws When the platform is Windows and `APPDATA` is missing, or
 *   when the platform is anything other than `"darwin"` or `"win32"`.
 */
export function getUserDataDir(): string {
  return _resolveUserDataDir({
    platform: process.platform,
    home: process.env.HOME ?? process.env.USERPROFILE ?? "",
    appdata: process.env.APPDATA,
  });
}
