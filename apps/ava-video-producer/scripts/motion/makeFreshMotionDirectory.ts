import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDirectory } from "../lib/planHelpers/planHelpers";
import { ROOT } from "./motion.constants";

/**
 * Makes an empty directory at `relative` under `out/motion/`, moving any
 * directory already there into `out/motion/.history/`. Use it wherever a
 * motion run needs a clean output folder without losing the previous one.
 */
export async function makeFreshMotionDirectory(
  relative: string,
): Promise<string> {
  const parent = await ensureDirectory(ROOT, "out/motion");
  const target = path.join(parent, relative);
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("Motion output must be an owned directory");
    }
    const history = await ensureDirectory(ROOT, "out/motion/.history");
    await fs.rename(
      target,
      path.join(
        history,
        `${relative.replaceAll("/", "-")}-${Date.now()}-${randomUUID().slice(0, 8)}`,
      ),
    );
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
  return ensureDirectory(ROOT, `out/motion/${relative}`);
}
