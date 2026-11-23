import fs from "node:fs/promises";
import path from "node:path";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { assertAudioMix } from "./assertAudioMix";
import { assertPictureDuration } from "./assertPictureDuration";
import { createAudioMixArgs } from "./createAudioMixArgs";
import { getAudioTracksFromPlan } from "./getAudioTracksFromPlan";
import { MediaBinaries } from "./MediaBinaries";
import { run } from "./run";
import { validateMedia } from "./validateMedia";
import type { MixAudioParameters } from "./MediaHelpers.types";
/** Mixes approved audio and verifies timing, signal and unchanged picture. */
export async function mixAudio({
  plan,
  root,
  picture,
  destination,
}: Readonly<MixAudioParameters>): Promise<boolean> {
  if (path.resolve(picture) === path.resolve(destination)) {
    throw new Error(
      "Audio mix destination must differ from the checked picture",
    );
  }
  await assertPictureDuration({ plan, picture });
  await validateMedia({ plan, root });
  const tracks = getAudioTracksFromPlan(plan);
  if (!tracks.length) {
    await fs.copyFile(picture, destination);
    return false;
  }
  const expectedDuration = StoryboardTimeline.durationInFrames(plan) / plan.fps;
  const args = await createAudioMixArgs({
    picture,
    destination,
    root,
    tracks,
    fps: plan.fps,
    duration: expectedDuration,
  });
  await run({ command: MediaBinaries.ffmpeg, args, options: { quiet: true } });
  await assertAudioMix({ picture, destination, tracks, expectedDuration });
  return true;
}
