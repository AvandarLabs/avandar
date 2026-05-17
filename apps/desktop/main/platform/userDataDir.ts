import { join } from "node:path";

const APP_NAME = "Avandar";

/**
 * Inputs for {@link resolveUserDataDir}. Accepts the host `platform`
 * string, the user's home directory, and the value of `APPDATA` (Windows
 * only). Keeping the inputs explicit lets the pure function be tested
 * across platform fixtures without mocking `process`.
 */
export type ResolveUserDataDirArgs = {
  platform: NodeJS.Platform | string;
  home: string;
  appdata: string | undefined;
};

/**
 * Pure resolver that returns the per-OS-user application data directory
 * for the Avandar desktop shell. macOS returns
 * `<home>/Library/Application Support/Avandar`; Windows returns
 * `<APPDATA>/Avandar`; every other platform throws (Linux support is
 * tracked separately).
 *
 * @param args - Resolved `(platform, home, appdata)` inputs.
 * @returns The absolute path where Bun-main services should write SQLite,
 *   DuckDB, blob, and keychain state.
 * @throws When `platform` is Windows and `APPDATA` is missing, or when
 *   `platform` is anything other than `"darwin"` or `"win32"`.
 */
export function resolveUserDataDir(
  args: Readonly<ResolveUserDataDirArgs>,
): string {
  if (args.platform === "darwin") {
    return join(args.home, "Library", "Application Support", APP_NAME);
  }
  if (args.platform === "win32") {
    if (args.appdata === undefined || args.appdata === "") {
      throw new Error("APPDATA required on win32");
    }
    // Use string concatenation with the Windows separator so the path
    // round-trips regardless of the host OS running this code (Node's
    // `path.join` on macOS would emit forward slashes). Keeps the resolver
    // portable across CI hosts.
    return `${args.appdata}\\${APP_NAME}`;
  }
  throw new Error(`unsupported platform: ${args.platform}`);
}

/**
 * Convenience entry point that reads `process.platform`, `HOME` /
 * `USERPROFILE`, and `APPDATA` from the current environment and delegates
 * to {@link resolveUserDataDir}. Use from `apps/desktop/main/index.ts`
 * startup; everywhere else, prefer injecting the resolved path so callers
 * stay testable.
 *
 * @returns The absolute user-data directory for this process.
 */
export function getUserDataDir(): string {
  return resolveUserDataDir({
    platform: process.platform,
    home: process.env.HOME ?? process.env.USERPROFILE ?? "",
    appdata: process.env.APPDATA,
  });
}
