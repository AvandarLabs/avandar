import { propEq } from "@avandar/utils";
import { type Storyboard } from "../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { probe } from "./probe";
/** Verify picture duration before a mix can truncate or extend it. */
export async function assertPictureDuration({
  plan,
  picture,
}: Readonly<{
  plan: Storyboard;
  picture: string;
}>): Promise<void> {
  const info = await probe(picture);
  const video = info.streams.find(propEq("codec_type", "video"));
  if (!video) {
    throw new Error("Picture has no video stream");
  }
  const duration = Number(video.duration ?? info.duration);
  if (
    !Number.isFinite(duration) ||
    Math.abs(duration - StoryboardTimeline.durationInFrames(plan) / plan.fps) >
      1 / plan.fps + 0.002
  ) {
    throw new Error("Picture duration does not match the storyboard");
  }
}
