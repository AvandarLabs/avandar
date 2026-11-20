import { propEq } from "@avandar/utils";
import {
  storyboardSchema,
  timeline,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";

/** The frame an SRT timestamp such as `00:01:02,500` falls on at `fps`. */
function _getFrameFromSrtTimestamp(value: string, fps: number): number {
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) {
    throw new Error(`Invalid SRT timestamp: ${value}`);
  }
  return Math.round(
    (Number(match[1]) * 3600 +
      Number(match[2]) * 60 +
      Number(match[3]) +
      Number(match[4]) / 1000) *
      fps,
  );
}

/** One narration cue retimed from its SRT block, checked against its text. */
function _makeCueFromSrtBlock(options: {
  plan: Readonly<Storyboard>;
  block: string;
  index: number;
}): Storyboard["narration"][number] {
  const { plan, block, index } = options;
  const lines = block.split("\n");
  if (/^\d+$/.test(lines[0])) {
    lines.shift();
  }
  const cueTimestamps = lines.shift()?.split(/\s+-->\s+/);
  if (!cueTimestamps || cueTimestamps.length !== 2) {
    throw new Error(`Invalid SRT cue ${index + 1}`);
  }
  const cue = plan.narration[index];
  const normalize = (value: string) => {
    return value.replace(/\s+/g, " ").trim();
  };
  if (normalize(lines.join(" ")) !== normalize(cue.text)) {
    throw new Error(`SRT text differs from narration cue ${cue.id}`);
  }
  const shot = timeline(plan).find(propEq("id", cue.shotId))!;
  const { audio: _audio, ...withoutAudio } = cue;
  return {
    ...withoutAudio,
    beatId: undefined,
    startFrame:
      _getFrameFromSrtTimestamp(cueTimestamps[0], plan.fps) - shot.startFrame,
    endFrame:
      _getFrameFromSrtTimestamp(cueTimestamps[1], plan.fps) - shot.startFrame,
  };
}

/**
 * Retimes a storyboard's narration cues from manually aligned SRT blocks with
 * exact text verification, attaching `audio` as `narrationTrack`. Performs no
 * speech recognition. Called by `alignRecording`.
 */
export function applySrt({
  plan,
  srt,
  audio,
}: Readonly<{
  plan: Readonly<Storyboard>;
  srt: string;
  audio: string;
}>): Storyboard {
  const blocks = srt
    .replace(/^﻿/, "")
    .replaceAll("\r\n", "\n")
    .trim()
    .split(/\n\s*\n/);
  if (blocks.length !== plan.narration.length) {
    throw new Error("SRT cue count must match the storyboard narration");
  }
  return storyboardSchema.parse({
    ...plan,
    narration: blocks.map((block, index) => {
      return _makeCueFromSrtBlock({ plan, block, index });
    }),
    narrationTrack: { src: audio, startFrame: 0, volume: 1 },
  });
}
