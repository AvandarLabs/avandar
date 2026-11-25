import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { PipelineTestFixtures } from "../../../tests/PipelineTestFixtures";
import { MediaHelpers } from "./MediaHelpers";

test("audio mix preserves video packets and duration while retaining separate narration and SFX windows", async () => {
  return PipelineTestFixtures.temporary(async (root) => {
    const { picture } = await _createAudioVideoSources(root);
    const plan = PipelineTestFixtures.fixture();
    await MediaHelpers.validateMedia({
      plan,
      root,
    });
    const final = path.join(root, "final.mp4");
    assert.equal(
      await MediaHelpers.mixAudio({
        plan,
        root,
        picture,
        destination: final,
      }),
      true,
    );
    await _assertUnchangedVideoPackets({ final, picture });
    await _assertNarrationAndEffectWindows(final);
    await _assertInvalidMediaTiming({ root, picture, plan });
  });
});

async function _assertInvalidMediaTiming({
  root,
  picture,
  plan,
}: Readonly<{
  root: string;
  picture: string;
  plan: ReturnType<typeof PipelineTestFixtures.fixture>;
}>): Promise<void> {
  const overlong = structuredClone(plan);
  overlong.narration[0].endFrame = 9;
  await assert.rejects(
    MediaHelpers.validateMedia({
      plan: overlong,
      root,
    }),
    /exceeds/,
  );
  const lateEffect = structuredClone(plan);
  lateEffect.soundEffects[0].atFrame = 59;
  await assert.rejects(
    MediaHelpers.validateMedia({
      plan: lateEffect,
      root,
    }),
    /beyond/,
  );
  const wrongDuration = structuredClone(plan);
  wrongDuration.shots[1].durationInFrames = 60;
  await assert.rejects(
    MediaHelpers.mixAudio({
      plan: wrongDuration,
      root,
      picture,
      destination: path.join(root, "wrong.mp4"),
    }),
    /duration/i,
  );
}

async function _assertNarrationAndEffectWindows(final: string): Promise<void> {
  assert.ok(
    (await MediaHelpers.audioPeak({
      filename: final,
      start: 0.2,
      duration: 0.2,
    })) > -50,
    "narration survived",
  );
  assert.ok(
    (await MediaHelpers.audioPeak({
      filename: final,
      start: 1.25,
      duration: 0.1,
    })) > -50,
    "sound effect survived",
  );
  assert.ok(
    (await MediaHelpers.audioPeak({
      filename: final,
      start: 0.8,
      duration: 0.15,
    })) < -80,
    "gap remains below the codec noise floor",
  );
}

async function _assertUnchangedVideoPackets({
  final,
  picture,
}: Readonly<{ final: string; picture: string }>): Promise<void> {
  assert.equal(
    await MediaHelpers.videoHash(final),
    await MediaHelpers.videoHash(picture),
  );
  const frameHash = (filename: string) => {
    return MediaHelpers.run({
      command: MediaHelpers.ffmpeg,
      args: [
        "-v",
        "error",
        "-i",
        filename,
        "-map",
        "0:v:0",
        "-f",
        "framemd5",
        "-",
      ],
      options: { quiet: true },
    });
  };
  assert.equal(await frameHash(final), await frameHash(picture));
  assert.ok(Math.abs((await MediaHelpers.probe(final)).duration - 2) < 0.08);
}

async function _createAudioVideoSources(
  root: string,
): Promise<Readonly<{ picture: string }>> {
  const picture = path.join(root, "picture.mp4");
  await MediaHelpers.run({
    command: MediaHelpers.ffmpeg,
    args: [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=640x400:r=30:d=2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      picture,
    ],
    options: { quiet: true },
  });
  for (const [name, frequency, seconds] of [
    ["voice", 440, 0.5],
    ["effect", 880, 0.2],
  ] as const) {
    await MediaHelpers.run({
      command: MediaHelpers.ffmpeg,
      args: [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequency}:sample_rate=48000:duration=${seconds}`,
        path.join(root, "public", `${name}.wav`),
      ],
      options: { quiet: true },
    });
  }
  return { picture };
}
