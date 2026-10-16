import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, mkdtemp, readdir, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { validateId } from "./urlSafety.mjs";

const FIXTURE_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".geojson",
  ".xlsx",
  ".pdf",
]);

/** Require a non-hidden relative path with no traversal or unsafe characters. */
export function safeRelativePath(value, name = "path") {
  if (
    typeof value !== "string" ||
    !value ||
    isAbsolute(value) ||
    /[\\:%?#\u0000-\u001f]/.test(value) ||
    value.split("/").some((part) => !part || part.startsWith("."))
  ) {
    throw new Error(
      `${name} must be a non-hidden relative path without traversal`,
    );
  }
  return value;
}

/** Check whether a candidate path resolves inside a root directory. */
export function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
}

/** Stream a file's SHA-256 digest without loading it into memory. */
export async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/** Resolve a path inside a root, rejecting symlinks and traversal at every segment. */
async function inspectPlainPath(root, file, directory = false) {
  const target = resolve(root, file);
  if (!isWithin(root, target))
    throw new Error("Path escapes its authorized root");
  const parts = relative(root, target).split(sep).filter(Boolean);
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink())
      throw new Error("Capture paths must not contain symbolic links");
    if (index < parts.length - 1 && !info.isDirectory())
      throw new Error("Capture path parent must be a directory");
  }
  const info = await stat(target);
  if (directory ? !info.isDirectory() : !info.isFile())
    throw new Error(
      directory ? "Expected a directory" : "Expected a regular fixture file",
    );
  return target;
}

/** Inventory and hash the fixture files a capture run will reference, rejecting symlinks. */
export async function fixtureInventory(root, fixtureDir, fixtureFiles) {
  root = await realpath(root);
  const dir = await inspectPlainPath(root, fixtureDir, true);
  const entries = [];
  const walk = async (subdir = "") => {
    for (const item of (
      await readdir(join(dir, subdir), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith(".")) continue;
      const name = subdir ? `${subdir}/${item.name}` : item.name;
      if (item.isSymbolicLink())
        throw new Error("Fixture directory contains a symbolic link");
      if (item.isDirectory()) await walk(name);
      else if (
        item.isFile() &&
        FIXTURE_EXTENSIONS.has(extname(name).toLowerCase())
      )
        entries.push(name);
      if (entries.length > 128)
        throw new Error("Fixture inventory exceeds 128 files");
    }
  };
  if (fixtureFiles === undefined) await walk();
  else entries.push(...fixtureFiles);
  if (
    !entries.length ||
    entries.length > 128 ||
    new Set(entries).size !== entries.length
  )
    throw new Error("Provide 1 to 128 unique fixture files");
  const files = [];
  for (const name of entries.sort()) {
    safeRelativePath(name, "fixture file");
    if (!FIXTURE_EXTENSIONS.has(extname(name).toLowerCase()))
      throw new Error("Unsupported fixture extension");
    const path = await inspectPlainPath(dir, name);
    const info = await stat(path);
    files.push({
      path: name,
      bytes: info.size,
      sha256: await sha256File(path),
    });
  }
  return {
    absoluteDir: dir,
    relativeDir: relative(root, dir).split(sep).join("/"),
    files,
  };
}

/** Create a fresh, owned, timestamped directory for one capture run under out/captures. */
export async function createRunDirectory(root, runLabel, now = new Date()) {
  validateId(runLabel, "runLabel");
  root = await realpath(root);
  let parent = root;
  for (const part of ["out", "captures"]) {
    parent = join(parent, part);
    try {
      await mkdir(parent);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const info = await lstat(parent);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new Error(
        "Capture output directories must be plain directories inside root",
      );
  }
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return mkdtemp(join(parent, `${runLabel}-${stamp}-`));
}
