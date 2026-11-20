import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  stat,
} from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { prop, sortObjList } from "@avandar/utils";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { validateId } from "./urlSafetyHelpers";

const FIXTURE_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".geojson",
  ".xlsx",
  ".pdf",
]);

const MAX_FIXTURE_FILES = 128;

/** One hashed fixture file a capture run references. */
export type FixtureFile = { path: string; bytes: number; sha256: string };

/** The fixture folder a capture run uses and every file in it, hashed. */
export type FixtureInventory = {
  absoluteDir: string;
  relativeDir: string;
  files: FixtureFile[];
};

/**
 * Requires a non-hidden relative path with no traversal or unsafe
 * characters.
 */
export function validateRelativePath(value: unknown, name = "path"): string {
  if (
    typeof value !== "string" ||
    !value ||
    isAbsolute(value) ||
    /[\\:%?#]/.test(value) ||
    value.split("").some((character) => {
      return character.charCodeAt(0) <= 0x1f;
    }) ||
    value.split("/").some((part) => {
      return !part || part.startsWith(".");
    })
  ) {
    throw new Error(
      `${name} must be a non-hidden relative path without traversal`,
    );
  }
  return value;
}

/** Whether a candidate path resolves inside a root directory. */
export function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}

/**
 * Resolves a path inside a root, rejecting symlinks and traversal at every
 * segment.
 */
async function _inspectPlainPath({
  root,
  file,
  isDirectory = false,
}: Readonly<{
  root: string;
  file: string;
  isDirectory?: boolean;
}>): Promise<string> {
  const target = resolve(root, file);
  if (!isWithin(root, target)) {
    throw new Error("Path escapes its authorized root");
  }
  const parts = relative(root, target).split(sep).filter(Boolean);
  let currentPath = root;
  // Check each segment in order, so the first link or file found stops it.
  for (const [index, part] of parts.entries()) {
    currentPath = join(currentPath, part);
    const pathStats = await lstat(currentPath);
    if (pathStats.isSymbolicLink()) {
      throw new Error("Capture paths must not contain symbolic links");
    }
    if (index < parts.length - 1 && !pathStats.isDirectory()) {
      throw new Error("Capture path parent must be a directory");
    }
  }
  const targetStats = await stat(target);
  if (isDirectory ? !targetStats.isDirectory() : !targetStats.isFile()) {
    throw new Error(
      isDirectory ? "Expected a directory" : "Expected a regular fixture file",
    );
  }
  return target;
}

/** Fixture files under `subdirectory`, visited in deterministic name order. */
async function _getFixturePaths({
  directory,
  subdirectory = "",
  seenCount = 0,
}: Readonly<{
  directory: string;
  subdirectory?: string;
  seenCount?: number;
}>): Promise<string[]> {
  const directoryEntries = sortObjList(
    await readdir(join(directory, subdirectory), { withFileTypes: true }),
    { sortBy: prop("name") },
  );
  const paths: string[] = [];
  // Visit entries in name order, so a limit or link error is deterministic.
  for (const directoryEntry of directoryEntries) {
    if (directoryEntry.name.startsWith(".")) {
      continue;
    }
    const name = subdirectory
      ? `${subdirectory}/${directoryEntry.name}`
      : directoryEntry.name;
    if (directoryEntry.isSymbolicLink()) {
      throw new Error("Fixture directory contains a symbolic link");
    }
    if (directoryEntry.isDirectory()) {
      paths.push(
        ...(await _getFixturePaths({
          directory,
          subdirectory: name,
          seenCount: seenCount + paths.length,
        })),
      );
    } else if (
      directoryEntry.isFile() &&
      FIXTURE_EXTENSIONS.has(extname(name).toLowerCase())
    ) {
      paths.push(name);
    }
    if (seenCount + paths.length > MAX_FIXTURE_FILES) {
      throw new Error("Fixture inventory exceeds 128 files");
    }
  }
  return paths;
}

async function _hashFixture(
  directory: string,
  name: string,
): Promise<FixtureFile> {
  validateRelativePath(name, "fixture file");
  if (!FIXTURE_EXTENSIONS.has(extname(name).toLowerCase())) {
    throw new Error("Unsupported fixture extension");
  }
  const path = await _inspectPlainPath({ root: directory, file: name });
  const fileStats = await stat(path);
  return {
    path: name,
    bytes: fileStats.size,
    sha256: await getSha256FromFile(path),
  };
}

/**
 * Inventories and hashes the fixture files a capture run will reference,
 * rejecting symlinks.
 */
export async function makeFixtureInventoryFromDirectory({
  rootPath,
  fixtureDir,
  fixtureFiles,
}: Readonly<{
  rootPath: string;
  fixtureDir: string;
  fixtureFiles?: readonly string[];
}>): Promise<FixtureInventory> {
  const root = await realpath(rootPath);
  const directory = await _inspectPlainPath({
    root,
    file: fixtureDir,
    isDirectory: true,
  });
  const entries =
    fixtureFiles === undefined
      ? await _getFixturePaths({ directory })
      : [...fixtureFiles];
  if (
    !entries.length ||
    entries.length > MAX_FIXTURE_FILES ||
    new Set(entries).size !== entries.length
  ) {
    throw new Error("Provide 1 to 128 unique fixture files");
  }
  const files: FixtureFile[] = [];
  // Hash in sorted order, stopping at the first unsafe file.
  for (const name of entries.sort()) {
    // Stop at the first unsafe fixture and bound file hashing to one file at a
    // time.
    // react-doctor-disable-next-line async-await-in-loop
    files.push(await _hashFixture(directory, name));
  }
  return {
    absoluteDir: directory,
    relativeDir: relative(root, directory).split(sep).join("/"),
    files,
  };
}

/**
 * Creates `parent`, or accepts it if it exists, and requires a plain
 * directory.
 */
async function _ensurePlainDirectory(parent: string): Promise<void> {
  try {
    await mkdir(parent);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST")
    ) {
      throw error;
    }
  }
  const parentStats = await lstat(parent);
  if (parentStats.isSymbolicLink() || !parentStats.isDirectory()) {
    throw new Error(
      "Capture output directories must be plain directories inside root",
    );
  }
}

/**
 * Creates a fresh, owned, timestamped directory for one capture run under
 * out/captures.
 */
export async function createRunDirectory({
  rootPath,
  runLabel,
  now = new Date(),
}: Readonly<{
  rootPath: string;
  runLabel: string;
  now?: Readonly<Date>;
}>): Promise<string> {
  validateId(runLabel, "runLabel");
  const root = await realpath(rootPath);
  const outDirectory = join(root, "out");
  await _ensurePlainDirectory(outDirectory);
  const parent = join(outDirectory, "captures");
  await _ensurePlainDirectory(parent);
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return mkdtemp(join(parent, `${runLabel}-${stamp}-`));
}
