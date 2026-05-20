/*
 * Filesystem-backed dataset blob store rooted at a single directory.
 *
 * The desktop equivalent of the web's Dexie-backed `DatasetBlobStore`:
 * the IPC handler in `apps/desktop/main/ipc/registerDatasetBlobHandlers/`
 * forwards `put` / `get` / `delete` / `exists` / `list` / `stat` calls
 * here.
 *
 * Two non-obvious invariants pinned by the test suite:
 *
 *   - Atomic writes via `<final>.tmp` + `renameSync`. If the process
 *     dies between `writeFileSync` and `renameSync`, the final key is
 *     never observed in a partial state; a stray `.tmp` is harmless and
 *     gets skipped by `list`.
 *   - Path-traversal guard rejects any key containing `..` segments so
 *     a malicious or buggy caller cannot escape the root directory.
 */

import * as nodeFs from "node:fs";
import { dirname, join, sep as pathSep, relative } from "node:path";

/**
 * Minimal slice of `node:fs` the blob store touches. Lifted out as a
 * type so the crash-simulation test can inject a fake `renameSync` that
 * throws after the `.tmp` file is on disk (G2.16). Production passes
 * `node:fs` itself.
 */
export type FsLike = {
  existsSync: typeof nodeFs.existsSync;
  mkdirSync: typeof nodeFs.mkdirSync;
  readdirSync: typeof nodeFs.readdirSync;
  readFileSync: typeof nodeFs.readFileSync;
  renameSync: typeof nodeFs.renameSync;
  statSync: typeof nodeFs.statSync;
  unlinkSync: typeof nodeFs.unlinkSync;
  writeFileSync: typeof nodeFs.writeFileSync;
};

/**
 * Stat shape returned by {@link FileSystemDatasetBlobStore.stat}.
 */
export type FileSystemBlobStat = {
  sizeBytes: number;
  mtimeMs: number;
};

/**
 * Public surface of the filesystem blob store. The keys are stored
 * verbatim as forward-slash paths relative to the root directory, so
 * call sites can compose them with `DatasetBlobKeys` helpers from
 * `shared/platform/types/DatasetBlobStore.types.ts`.
 */
export type FileSystemDatasetBlobStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<readonly string[]>;
  stat(key: string): Promise<FileSystemBlobStat | null>;
};

/*
 * Reject `..` segments on either separator so a malicious key can't
 * escape `rootDir`. Catches `a/../b`, `..\\evil`, and absolute paths.
 */
function _assertSafeKey(key: string): void {
  if (key.length === 0) {
    throw new Error("Invalid dataset blob key: empty string");
  }
  const segments = key.split(/[/\\]/);
  if (
    segments.some((segment) => {
      return segment === "..";
    })
  ) {
    throw new Error(`Invalid dataset blob key (path traversal): ${key}`);
  }
  if (key.startsWith("/") || /^[A-Za-z]:[/\\]/.test(key)) {
    throw new Error(`Invalid dataset blob key (absolute path): ${key}`);
  }
}

/**
 * Builds a {@link FileSystemDatasetBlobStore} rooted at `rootDir`. The
 * directory is created lazily on first write; reads against a missing
 * root return `null` / `false` / `[]` rather than throwing.
 *
 * @param rootDir - Absolute directory under which blob keys are stored.
 * @returns A ready-to-use {@link FileSystemDatasetBlobStore}.
 */
export function createFileSystemDatasetBlobStore(
  rootDir: string,
  fs: FsLike = nodeFs,
): FileSystemDatasetBlobStore {
  function resolvePath(key: string): string {
    _assertSafeKey(key);
    return join(rootDir, key);
  }

  return {
    async put(key, bytes) {
      const dst = resolvePath(key);
      fs.mkdirSync(dirname(dst), { recursive: true });
      const tmp = `${dst}.tmp`;
      fs.writeFileSync(tmp, bytes);
      fs.renameSync(tmp, dst);
    },

    async getBytes(key) {
      return fs.readFileSync(resolvePath(key));
    },

    async delete(key) {
      const p = resolvePath(key);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    },

    async exists(key) {
      return fs.existsSync(resolvePath(key));
    },

    async list(prefix) {
      // Normalise the prefix and resolve to the directory we should
      // walk. Empty / "/" prefix means "everything under rootDir".
      const normalisedPrefix = prefix.replace(/^\/+/, "");
      if (normalisedPrefix.length > 0) {
        _assertSafeKey(normalisedPrefix);
      }
      if (!fs.existsSync(rootDir)) {
        return [];
      }
      const baseDir =
        normalisedPrefix.length === 0 ?
          rootDir
        : join(rootDir, normalisedPrefix);
      if (!fs.existsSync(baseDir)) {
        return [];
      }

      const out: string[] = [];
      function walk(dir: string): void {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          if (!entry.isFile()) {
            continue;
          }
          // In-flight `<final>.tmp` files are not visible to callers.
          if (entry.name.endsWith(".tmp")) {
            continue;
          }
          const rel = relative(rootDir, full).split(pathSep).join("/");
          out.push(rel);
        }
      }
      walk(baseDir);
      return out;
    },

    async stat(key) {
      const p = resolvePath(key);
      if (!fs.existsSync(p)) {
        return null;
      }
      const s = fs.statSync(p);
      return { sizeBytes: s.size, mtimeMs: s.mtimeMs };
    },
  };
}
