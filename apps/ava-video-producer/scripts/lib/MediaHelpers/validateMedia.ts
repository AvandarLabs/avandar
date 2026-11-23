import { propEq } from "@avandar/utils";
import { type Storyboard } from "../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { getPublicAssetPathFromAsset } from "../planHelpers/planHelpers";
import { probe } from "./probe";
import type { MediaProbe } from "./MediaHelpers.types";

type MediaInspector = {
  inspect: (asset: string) => Promise<MediaProbe>;
  audio: (asset: string, label: string) => Promise<MediaProbe>;
};
function _createMediaInspector(root: string): MediaInspector {
  const cache = new Map<string, MediaProbe>();
  const inspect = async (asset: string): Promise<MediaProbe> => {
    if (!cache.has(asset)) {
      cache.set(
        asset,
        await probe(await getPublicAssetPathFromAsset({ root, asset })),
      );
    }
    return cache.get(asset)!;
  };
  return {
    inspect,
    audio: async (asset, label) => {
      const info = await inspect(asset);
      if (
        !info.streams.some(propEq("codec_type", "audio")) ||
        !Number.isFinite(info.duration) ||
        info.duration <= 0
      ) {
        throw new Error(`${label}: no usable audio stream`);
      }
      return info;
    },
  };
}
async function _validateShot({
  shot,
  plan,
  inspector,
}: Readonly<{
  shot: Storyboard["shots"][number];
  plan: Storyboard;
  inspector: MediaInspector;
}>): Promise<void> {
  if (shot.scene !== "media") {
    return;
  }
  const info = await inspector.inspect(shot.props.src);
  if (
    !info.streams.some((stream) => {
      return (
        stream.codec_type === "video" &&
        Number(stream.width) > 0 &&
        Number(stream.height) > 0
      );
    })
  ) {
    throw new Error(`${shot.id}: asset has no visual stream`);
  }
  if (
    shot.props.kind === "video" &&
    (!Number.isFinite(info.duration) ||
      info.duration + 0.04 <
        ((shot.props.trimBefore ?? 0) + shot.durationInFrames) / plan.fps)
  ) {
    throw new Error(`${shot.id}: video is shorter than trim + shot duration`);
  }
}
async function _validateNarrationTrack({
  plan,
  inspector,
}: Readonly<{ plan: Storyboard; inspector: MediaInspector }>): Promise<void> {
  if (!plan.narrationTrack) {
    return;
  }
  const info = await inspector.audio(
    plan.narrationTrack.src,
    "Narration track",
  );
  const start = plan.narrationTrack.startFrame / plan.fps;
  const end = start + info.duration;
  if (end > StoryboardTimeline.durationInFrames(plan) / plan.fps + 0.02) {
    throw new Error("Narration recording extends beyond the film");
  }
  const cues = StoryboardTimeline.absoluteCues(plan);
  if (cues[0] && start > cues[0].startFrame / plan.fps) {
    throw new Error("Narration starts after the first aligned cue");
  }
  if (cues.at(-1) && end + 0.1 < cues.at(-1)!.endFrame / plan.fps) {
    throw new Error("Narration recording ends before the last aligned cue");
  }
}
/** Checks media timing before rendering so approved audio cannot be cut off. */
export async function validateMedia({
  plan,
  root,
}: Readonly<{ plan: Storyboard; root: string }>): Promise<void> {
  const inspector = _createMediaInspector(root);
  // Media inspection stays serial so ffprobe uses one process at a time.
  for (const shot of plan.shots) {
    await _validateShot({ shot, plan, inspector });
  }
  for (const cue of plan.narration) {
    if (!cue.audio) {
      continue;
    }
    const info = await inspector.audio(cue.audio, cue.id);
    if (info.duration > (cue.endFrame - cue.startFrame) / plan.fps + 0.02) {
      throw new Error(
        `${cue.id}: recording exceeds its cue; retime the plan or rerecord`,
      );
    }
  }
  await _validateNarrationTrack({ plan, inspector });
  const total = StoryboardTimeline.durationInFrames(plan) / plan.fps;
  for (const sound of plan.soundEffects) {
    const info = await inspector.audio(sound.src, sound.id);
    if (sound.atFrame / plan.fps + info.duration > total + 0.02) {
      throw new Error(`${sound.id}: sound extends beyond the film`);
    }
  }
}
