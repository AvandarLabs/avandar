import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDirectory } from "../lib/planHelpers/planHelpers";
import type { Storyboard } from "../../src/storyboard/schema/schema";
/** Preserve the previous stage intact before creating its replacement. */
export async function freshStage(
  plan: Storyboard,
  name: string,
  workspace: string,
): Promise<string> {
  const parent = await ensureDirectory(workspace, `out/${plan.id}`);
  const target = path.join(parent, name);
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Stage output must be an owned directory");
    const history = await ensureDirectory(workspace, `out/${plan.id}/.history`);
    const stamp = new Date().toISOString().replaceAll(":", "-");
    await fs.rename(
      target,
      path.join(history, `${name}-${stamp}-${randomUUID().slice(0, 8)}`),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return ensureDirectory(workspace, `out/${plan.id}/${name}`);
}
