import fs from "node:fs/promises";
import path from "node:path";
import { captionFiles, shotList } from "../lib/planHelpers/planHelpers";
import { freshStage } from "./freshStage";
import { writeJson } from "./writeJson";
import type { Storyboard } from "../../src/storyboard/schema/schema";
/**
 * Writes the storyboard, shot list, transcript, and caption files for a plan.
 */
export async function exportPlan(
  plan: Storyboard,
  workspace: string,
): Promise<string> {
  const directory = await freshStage(plan, "plan", workspace);
  const captions = captionFiles(plan);
  await writeJson(path.join(directory, "storyboard.json"), plan);
  await writeJson(path.join(directory, "props.json"), { plan });
  await fs.writeFile(path.join(directory, "shotlist.md"), shotList(plan), {
    flag: "wx",
  });
  for (const [filename, text] of [
    ["transcript.txt", captions.transcript],
    ["captions.srt", captions.srt],
    ["captions.vtt", captions.vtt],
  ]) {
    await fs.writeFile(path.join(directory, filename), text, { flag: "wx" });
  }
  return directory;
}
