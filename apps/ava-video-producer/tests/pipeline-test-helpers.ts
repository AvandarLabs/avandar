import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { storyboardSchema, type Storyboard } from "../src/storyboard/schema/schema";

/** A small two-shot plan with narration and a sound effect, used by the pipeline unit tests. */
export function fixture(): Storyboard {
  return storyboardSchema.parse({
    version: 1,
    id: "pipeline-test",
    title: "Pipeline test",
    description: "Synthetic media",
    sourceNotes: ["Generated test fixtures"],
    purpose: "standalone",
    fps: 30,
    width: 1280,
    height: 800,
    delivery: { width: 640, height: 400 },
    shots: [
      {
        id: "first",
        scene: "metric",
        durationInFrames: 30,
        transitionInFrames: 0,
        props: { label: "One", value: 1 },
      },
      {
        id: "second",
        scene: "metric",
        durationInFrames: 30,
        transitionInFrames: 12,
        props: { label: "Two", value: 2 },
      },
    ],
    narration: [
      {
        id: "voice",
        shotId: "first",
        startFrame: 3,
        endFrame: 24,
        text: "Synthetic narration",
        audio: "voice.wav",
      },
    ],
    soundEffects: [
      { id: "click", src: "effect.wav", atFrame: 36, volume: 0.5 },
    ],
  });
}

/** Runs `action` against a scratch directory with `public/` and `src/` subdirectories, cleaning up after. */
export async function temporary(action: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pipeline-"));
  try {
    await fs.mkdir(path.join(root, "public"));
    await fs.mkdir(path.join(root, "src"));
    await action(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
