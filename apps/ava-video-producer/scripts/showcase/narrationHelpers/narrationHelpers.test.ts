import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { createNarrationLoader } from "./narrationHelpers";
import type { Film } from "../../../src/showcase/showcase.types";
import type { scratchTts } from "../../video";

function _film(text: string): Film {
  const plan = storyboardSchema.parse({
    version: 1,
    id: "avandar-import",
    title: "Speech fixture",
    description: "Captured cues",
    sourceNotes: ["Synthetic test input"],
    purpose: "standalone",
    fps: 30,
    width: 1280,
    height: 800,
    delivery: { width: 640, height: 400 },
    shots: [
      {
        id: "scene",
        scene: "metric",
        durationInFrames: 60,
        transitionInFrames: 0,
        props: { label: "Count", value: 1 },
      },
    ],
    narration: [
      { id: "voice", shotId: "scene", startFrame: 0, endFrame: 45, text },
    ],
  });
  return {
    id: plan.id,
    kind: "storyboard",
    source: "apps/ava-video-producer/storyboards/import.json",
    frames: 60,
    fps: 30,
    width: 1280,
    height: 800,
    delivery: plan.delivery,
    loop: false,
    showCaptions: true,
    plan,
  };
}

const _syntheticSpeech: typeof scratchTts = async (
  plan,
  _options,
  root,
  relativeDirectory,
) => {
  const directory = path.join(
    root,
    relativeDirectory ?? `out/${plan.id}/scratch`,
  );
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "voice.txt"),
    plan.narration[0].text,
    { flag: "wx" },
  );
  const asset = `narration/${path.basename(directory)}/voice.wav`;
  await fs.mkdir(path.dirname(path.join(root, "public", asset)), {
    recursive: true,
  });
  await fs.writeFile(path.join(root, "public", asset), plan.narration[0].text);
  const derived = {
    ...plan,
    narration: plan.narration.map((cue) => ({ ...cue, audio: asset })),
  };
  const filename = path.join(directory, "storyboard.json");
  await fs.writeFile(filename, JSON.stringify(derived), { flag: "wx" });
  return filename;
};

async function _temporary(action: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "showcase-narration-"));
  try {
    await action(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("concurrent source generations keep their captured cues and separate speech files", async () => {
  await _temporary(async (root) => {
    const narrate = createNarrationLoader({
      root,
      platform: "darwin",
      synthesize: _syntheticSpeech,
    });
    const [original, revised] = await Promise.all([
      narrate(_film("Original cue")),
      narrate(_film("Revised cue")),
    ]);
    const originalAudio = original.plan!.narration[0].audio!;
    const revisedAudio = revised.plan!.narration[0].audio!;
    assert.equal(original.plan!.narration[0].text, "Original cue");
    assert.equal(revised.plan!.narration[0].text, "Revised cue");
    assert.notEqual(originalAudio, revisedAudio);
    assert.equal(
      await fs.readFile(path.join(root, "public", originalAudio), "utf8"),
      "Original cue",
    );
    assert.equal(
      await fs.readFile(path.join(root, "public", revisedAudio), "utf8"),
      "Revised cue",
    );
  });
});

test("cached speech preserves each caller caption choice across concurrent requests", async () => {
  await _temporary(async (root) => {
    const narrate = createNarrationLoader({
      root,
      platform: "darwin",
      synthesize: _syntheticSpeech,
    });
    const film = _film("Shared cue");
    const [visible, hidden] = await Promise.all([
      narrate(film),
      narrate({ ...film, showCaptions: false }),
    ]);
    assert.equal(visible.showCaptions, true);
    assert.equal(hidden.showCaptions, false);
    assert.equal(
      visible.plan!.narration[0].audio,
      hidden.plan!.narration[0].audio,
    );
    assert.equal(
      (await fs.readdir(path.join(root, "public/narration"))).length,
      1,
    );
  });
});
