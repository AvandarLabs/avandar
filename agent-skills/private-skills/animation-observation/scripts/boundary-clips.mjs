#!/usr/bin/env node
/**
 * Prints the close-up clips and shot stills a refine pass would send for a
 * draft motion spec. `argon.mjs --clips-from <spec>` computes the same list
 * itself; this script is for checking what will be sent.
 *
 * Usage: node boundary-clips.mjs <motion-spec.md> [--pad 30] [--frames 2357]
 */
import { parseArgs } from "node:util";
import { buildBoundaryClips, buildShotStills, readStoryboard } from "./lib/specEvents.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    pad: { type: "string", default: "30" },
    frames: { type: "string" },
  },
});
const [specPath] = positionals;
if (!specPath) {
  console.error("Usage: boundary-clips.mjs <motion-spec.md> [--pad 30] [--frames <n>]");
  process.exit(2);
}

const storyboard = await readStoryboard(specPath);
const numFrames = Number(values.frames ?? storyboard.total_frames ?? storyboard.shots.at(-1).to);
const clips = buildBoundaryClips(storyboard.shots, Number(values.pad), numFrames);
for (const [startFrame, endFrame] of clips) console.log(`clip f${startFrame}-f${endFrame}`);
for (const { shotId, frame } of buildShotStills(storyboard.shots)) {
  console.log(`still ${shotId} f${frame}`);
}
const numClipFrames = clips.reduce((sum, [start, end]) => sum + end - start, 0);
console.error(`${clips.length} clips, ${numClipFrames} frames; ${storyboard.shots.length} stills`);
