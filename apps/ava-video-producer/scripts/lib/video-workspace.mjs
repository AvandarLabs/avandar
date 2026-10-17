import fs from "node:fs/promises";
import path from "node:path";
import { productRoot } from "./product-source.mjs";

/** Resolve local film workspaces without following symlinks. */
export async function videoWorkspace(producerRoot, filename) {
  const privateRoot = path.join(productRoot(producerRoot), ".videos");
  const absolute = path.resolve(filename);
  const relative = path.relative(privateRoot, absolute);
  if (relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
    return producerRoot;
  const parts = relative.split(path.sep);
  if (parts.length < 2 || !parts[0] || parts[0].startsWith("."))
    throw new Error("Private plans belong in .videos/<project>/.");
  let current = privateRoot;
  for (const part of ["", ...parts]) {
    if (part) current = path.join(current, part);
    if ((await fs.lstat(current)).isSymbolicLink())
      throw new Error("Private project paths cannot contain a symlink");
  }
  return path.join(privateRoot, parts[0]);
}
