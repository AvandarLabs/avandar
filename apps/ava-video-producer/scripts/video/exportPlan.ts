import fs from "node:fs/promises";
import path from "node:path";
import { makeCaptionFilesFromPlan } from "../lib/planHelpers/makeCaptionFilesFromPlan";
import { makeShotListFromPlan } from "../lib/planHelpers/planHelpers";
import { freshStage } from "./freshStage";
import { writeJson } from "./writeJson";
import type { Storyboard } from "../../src/storyboard/schema/schema";
/**
 * Writes the storyboard, shot list, transcript, and caption files for a plan.
 */
export async function exportPlan({
  plan,
  workspace,
}: Readonly<{
  plan: Storyboard;
  workspace: string;
}>): Promise<string> {
  const directory = await freshStage({
    plan,
    name: "plan",
    workspace,
  });
  const captions = makeCaptionFilesFromPlan(plan);
  await writeJson({
    filename: path.join(directory, "storyboard.json"),
    value: plan,
  });
  await writeJson({
    filename: path.join(directory, "props.json"),
    value: { plan },
  });
  await fs.writeFile(
    path.join(directory, "shotlist.md"),
    makeShotListFromPlan(plan),
    {
      flag: "wx",
    },
  );
  for (const [filename, text] of [
    ["transcript.txt", captions.transcript],
    ["captions.srt", captions.srt],
    ["captions.vtt", captions.vtt],
  ]) {
    await fs.writeFile(path.join(directory, filename), text, { flag: "wx" });
  }
  return directory;
}
