import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { ensureDirectory } from "../../lib/planHelpers/planHelpers";
import { freshStage } from "../freshStage";
import { validate } from "../validate";
import { writeJson } from "../writeJson";
import { synthesizeCue } from "./synthesizeCue";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { Options } from "../video.types";

type ScratchTtsParameters = {
  plan: Storyboard;
  options: Pick<Options, "filename" | "voice" | "rate">;
  workspace: string;
  relativeDirectory?: string;
};
async function _getScratchDirectory({
  relativeDirectory,
  workspace,
  plan,
}: Readonly<
  Pick<ScratchTtsParameters, "relativeDirectory" | "workspace" | "plan">
>): Promise<string> {
  return relativeDirectory
    ? await ensureDirectory({
        root: workspace,
        relative: relativeDirectory,
      })
    : await freshStage({
        plan,
        name: "scratch",
        workspace,
      });
}
async function _assertScratchPlatform(plan: Storyboard): Promise<void> {
  if (!plan.narration.length) {
    throw new Error("The storyboard has no narration cues");
  }
  if (process.platform !== "darwin") {
    throw new Error(
      "Scratch TTS requires macOS /usr/bin/say; use align with a provided recording on this platform",
    );
  }
  await fs.access("/usr/bin/say", fs.constants.X_OK);
}
async function _synthesizeNarration({
  plan,
  options,
  directory,
  namespace,
  assets,
}: Readonly<
  Pick<ScratchTtsParameters, "plan" | "options"> & {
    directory: string;
    namespace: string;
    assets: string;
  }
>): Promise<{
  cues: Storyboard["narration"];
  metadata: Array<Awaited<ReturnType<typeof synthesizeCue>>>;
}> {
  const cues = [];
  const metadata = [];
  for (const cue of plan.narration) {
    const src = `${namespace}/${cue.id}.wav`;
    metadata.push(
      // Bound local speech synthesis and conversion to one cue process pipeline
      // at a time.
      // react-doctor-disable-next-line async-await-in-loop
      await synthesizeCue({
        text: cue.text,
        directory,
        cueId: cue.id,
        destination: path.join(assets, `${cue.id}.wav`),
        seconds: (cue.endFrame - cue.startFrame) / plan.fps,
        options,
      }),
    );
    cues.push({ ...cue, audio: src });
  }
  return { cues, metadata };
}
async function _writeScratchMetadata({
  directory,
  options,
  namespace,
  metadata,
}: Readonly<{
  directory: string;
  options: ScratchTtsParameters["options"];
  namespace: string;
  metadata: ReadonlyArray<Awaited<ReturnType<typeof synthesizeCue>>>;
}>): Promise<void> {
  await writeJson({
    filename: path.join(directory, "metadata.json"),
    value: {
      kind: "scratch-tts",
      engine: "macOS say",
      voice: options.voice ?? "system default",
      createdAt: new Date().toISOString(),
      sourcePlan: path.resolve(options.filename),
      assets: namespace,
      cues: metadata,
    },
  });
}
/** Produce scratch speech from captured cues in an owned output directory. */
export async function scratchTts({
  plan,
  options,
  workspace,
  relativeDirectory,
}: Readonly<ScratchTtsParameters>): Promise<string> {
  await _assertScratchPlatform(plan);
  const directory = await _getScratchDirectory({
    relativeDirectory,
    workspace,
    plan,
  });
  const namespace = `narration/${plan.id}/scratch-${randomUUID()}`;
  const assets = await ensureDirectory({
    root: workspace,
    relative: `public/${namespace}`,
  });
  const { cues, metadata } = await _synthesizeNarration({
    plan,
    options,
    directory,
    namespace,
    assets,
  });
  const derived = storyboardSchema.parse({
    ...plan,
    narrationTrack: undefined,
    narration: cues,
    sourceNotes: [
      ...plan.sourceNotes,
      "Scratch narration generated locally with macOS say. Timing aid, not final voice performance.",
    ],
  });
  await validate({
    plan: derived,
    workspace,
  });
  const filename = path.join(directory, "storyboard.json");
  await writeJson({
    filename,
    value: derived,
  });
  await _writeScratchMetadata({ directory, options, namespace, metadata });
  return filename;
}
