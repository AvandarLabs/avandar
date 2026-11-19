import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { ensureDirectory } from "../../lib/planHelpers";
import { freshStage } from "../freshStage";
import { validate } from "../validate";
import { writeJson } from "../writeJson";
import { synthesizeCue } from "./synthesizeCue";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { Options } from "../video.types";

/** Produce scratch speech from captured cues in an owned output directory. */
export async function scratchTts(
  plan: Storyboard,
  options: Pick<Options, "filename" | "voice" | "rate">,
  workspace: string,
  relativeDirectory?: string,
): Promise<string> {
  if (!plan.narration.length)
    throw new Error("The storyboard has no narration cues");
  if (process.platform !== "darwin")
    throw new Error(
      "Scratch TTS requires macOS /usr/bin/say; use align with a provided recording on this platform",
    );
  await fs.access("/usr/bin/say", fs.constants.X_OK);
  const directory = relativeDirectory
    ? await ensureDirectory(workspace, relativeDirectory)
    : await freshStage(plan, "scratch", workspace);
  const namespace = `narration/${plan.id}/scratch-${randomUUID()}`;
  const assets = await ensureDirectory(workspace, `public/${namespace}`);
  const cues = [];
  const metadata = [];
  for (const cue of plan.narration) {
    const src = `${namespace}/${cue.id}.wav`;
    metadata.push(
      await synthesizeCue(
        cue.text,
        directory,
        cue.id,
        path.join(assets, `${cue.id}.wav`),
        (cue.endFrame - cue.startFrame) / plan.fps,
        options,
      ),
    );
    cues.push({ ...cue, audio: src });
  }
  const derived = storyboardSchema.parse({
    ...plan,
    narrationTrack: undefined,
    narration: cues,
    sourceNotes: [
      ...plan.sourceNotes,
      "Scratch narration generated locally with macOS say. Timing aid, not final voice performance.",
    ],
  });
  await validate(derived, workspace);
  const filename = path.join(directory, "storyboard.json");
  await writeJson(filename, derived);
  await writeJson(path.join(directory, "metadata.json"), {
    kind: "scratch-tts",
    engine: "macOS say",
    voice: options.voice ?? "system default",
    createdAt: new Date().toISOString(),
    sourcePlan: path.resolve(options.filename),
    assets: namespace,
    cues: metadata,
  });
  return filename;
}
