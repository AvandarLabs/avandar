import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  ffmpeg,
  run,
  probe,
  validateMedia,
  mixAudio,
  videoHash,
  audioPeak,
} from "../scripts/lib/mediaHelpers";
import { fixture, temporary } from "./pipeline-test-helpers";

test("audio mix preserves video packets and duration while retaining separate narration and SFX windows", async () =>
  temporary(async (root) => {
    const picture = path.join(root, "picture.mp4");
    await run(
      ffmpeg,
      [
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
      { quiet: true },
    );
    for (const [name, frequency, seconds] of [
      ["voice", 440, 0.5],
      ["effect", 880, 0.2],
    ] as const) {
      await run(
        ffmpeg,
        [
          "-y",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          `sine=frequency=${frequency}:sample_rate=48000:duration=${seconds}`,
          path.join(root, "public", `${name}.wav`),
        ],
        { quiet: true },
      );
    }
    const plan = fixture();
    await validateMedia(plan, root);
    const final = path.join(root, "final.mp4");
    assert.equal(await mixAudio(plan, root, picture, final), true);
    assert.equal(await videoHash(final), await videoHash(picture));
    const frameHash = (filename: string) =>
      run(
        ffmpeg,
        ["-v", "error", "-i", filename, "-map", "0:v:0", "-f", "framemd5", "-"],
        { quiet: true },
      );
    assert.equal(await frameHash(final), await frameHash(picture));
    assert.ok(Math.abs((await probe(final)).duration - 2) < 0.08);
    assert.ok((await audioPeak(final, 0.2, 0.2)) > -50, "narration survived");
    assert.ok(
      (await audioPeak(final, 1.25, 0.1)) > -50,
      "sound effect survived",
    );
    assert.ok(
      (await audioPeak(final, 0.8, 0.15)) < -80,
      "gap remains below the codec noise floor",
    );
    const overlong = structuredClone(plan);
    overlong.narration[0].endFrame = 9;
    await assert.rejects(validateMedia(overlong, root), /exceeds/);
    const lateEffect = structuredClone(plan);
    lateEffect.soundEffects[0].atFrame = 59;
    await assert.rejects(validateMedia(lateEffect, root), /beyond/);
    const wrongDuration = structuredClone(plan);
    wrongDuration.shots[1].durationInFrames = 60;
    await assert.rejects(
      mixAudio(wrongDuration, root, picture, path.join(root, "wrong.mp4")),
      /duration/i,
    );
  }));
