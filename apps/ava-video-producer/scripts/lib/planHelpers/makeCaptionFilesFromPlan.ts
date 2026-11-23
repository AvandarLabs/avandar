import { prop } from "@avandar/utils";
import { type Storyboard } from "../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { makeTimestampFromFrame } from "./makeTimestampFromFrame";

/**
 * Formats a plan's narration into SRT and WebVTT caption files and a plain
 * transcript. Called by `exportPlan` and `makeCaptionFilesFromRequest`.
 */
export function makeCaptionFilesFromPlan(plan: Readonly<Storyboard>): {
  srt: string;
  vtt: string;
  transcript: string;
} {
  const cues = StoryboardTimeline.absoluteCues(plan);
  const srt = cues
    .map((cue, index) => {
      const start = makeTimestampFromFrame({
        frame: cue.startFrame,
        fps: plan.fps,
      });
      const end = makeTimestampFromFrame({
        frame: cue.endFrame,
        fps: plan.fps,
      });
      return `${index + 1}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join("\n");
  const vtt = `WEBVTT\n\n${cues
    .map((cue) => {
      const start = makeTimestampFromFrame({
        frame: cue.startFrame,
        fps: plan.fps,
        separator: ".",
      });
      const end = makeTimestampFromFrame({
        frame: cue.endFrame,
        fps: plan.fps,
        separator: ".",
      });
      return `${cue.id}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join("\n")}`;
  const transcript = `${plan.title}\n\n${cues.map(prop("text")).join("\n\n")}\n`;
  return { srt, vtt, transcript };
}
