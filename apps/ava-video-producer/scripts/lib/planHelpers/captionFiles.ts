import {
  absoluteCues,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";
import { timestamp } from "./timestamp";

/**
 * The plan's narration as SRT and WebVTT caption files and a plain
 * transcript. Use it wherever a film's captions are exported, such as a
 * render or a showcase download.
 */
export function captionFiles(plan: Storyboard) {
  const cues = absoluteCues(plan);
  const srt = cues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestamp(cue.startFrame, plan.fps)} --> ${timestamp(cue.endFrame, plan.fps)}\n${cue.text}\n`,
    )
    .join("\n");
  const vtt =
    "WEBVTT\n\n" +
    cues
      .map(
        (cue) =>
          `${cue.id}\n${timestamp(cue.startFrame, plan.fps, ".")} --> ${timestamp(cue.endFrame, plan.fps, ".")}\n${cue.text}\n`,
      )
      .join("\n");
  const transcript = `${plan.title}\n\n${cues.map((cue) => cue.text).join("\n\n")}\n`;
  return { srt, vtt, transcript };
}
