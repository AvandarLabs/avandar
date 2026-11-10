#!/usr/bin/env node
/**
 * Prints the close-up clips and shot stills `argon.mjs --clips-from` would
 * send for a motion spec or a producer `storyboard.json`. `argon.mjs
 * --dry-run` prints the same plan for a full command line.
 *
 * Usage: node boundary-clips.mjs <motion-spec.md|storyboard.json> [--pad 30] --frames <n>
 */
import { parseArgs } from "node:util";
import { buildBoundaryClips, buildShotStills, readShots } from "./lib/specEvents.mjs";

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

const shots = await readShots(specPath);
const numFrames = Number(values.frames ?? shots.at(-1).to);
const clips = buildBoundaryClips(shots, Number(values.pad), numFrames);
for (const [startFrame, endFrame] of clips) console.log(`clip f${startFrame}-f${endFrame}`);
for (const { shotId, frame } of buildShotStills(shots)) {
  console.log(`still ${shotId} f${frame}`);
}
const numClipFrames = clips.reduce((sum, [start, end]) => sum + end - start, 0);
console.error(`${clips.length} clips, ${numClipFrames} frames; ${shots.length} stills`);
