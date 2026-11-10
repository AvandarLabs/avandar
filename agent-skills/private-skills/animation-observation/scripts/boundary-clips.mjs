#!/usr/bin/env node
/**
 * Lists the close-up clips the refine pass needs, from a draft motion spec.
 *
 * Reads the spec's fenced ```yaml storyboard script and returns one clip
 * around every shot boundary and around every transition window, padded on
 * both sides and merged where clips overlap. Prints the clips as `--clip`
 * arguments for `argon.mjs`, one per line.
 *
 * Usage: node boundary-clips.mjs <motion-spec.md> [--pad 1.0] [--fps 30]
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    pad: { type: "string", default: "1.0" },
    fps: { type: "string", default: "30" },
  },
});
const [specPath] = positionals;
if (!specPath) {
  console.error("Usage: boundary-clips.mjs <motion-spec.md> [--pad 1.0]");
  process.exit(2);
}

const workspaceRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const { parse } = createRequire(
  path.join(workspaceRoot, "apps/ava-video-producer/package.json"),
)("yaml");

/** Returns the storyboard script from the spec's ```yaml block that has `shots`. */
function readStoryboard(markdown) {
  const yamlBlocks = [...markdown.matchAll(/```yaml\n([\s\S]*?)```/g)].map((match) => match[1]);
  const storyboard = yamlBlocks.map((block) => parse(block)).find((doc) => doc?.shots);
  if (!storyboard) throw new Error("No ```yaml storyboard with `shots` found in the spec");
  return storyboard;
}

/** Collects [startFrame, endFrame] windows around boundaries and transitions. */
function buildEventWindows(shots) {
  return shots.flatMap((shot, index) => {
    const windows = [];
    if (index > 0) windows.push([shot.from, shot.from]);
    if (shot.transition_out) windows.push([shot.transition_out.from, shot.transition_out.to]);
    return windows;
  });
}

/** Pads windows into clips in seconds and merges any that overlap. */
function mergeIntoClips(windows, fps, padSeconds, totalSeconds) {
  const clips = windows
    .map(([startFrame, endFrame]) => [
      Math.max(0, startFrame / fps - padSeconds),
      Math.min(totalSeconds, endFrame / fps + padSeconds),
    ])
    .sort((left, right) => left[0] - right[0]);
  return clips.reduce((merged, clip) => {
    const lastClip = merged.at(-1);
    if (lastClip && clip[0] <= lastClip[1]) lastClip[1] = Math.max(lastClip[1], clip[1]);
    else merged.push([...clip]);
    return merged;
  }, []);
}

const fps = Number(values.fps);
const storyboard = readStoryboard(await readFile(specPath, "utf8"));
const totalSeconds = (storyboard.total_frames ?? storyboard.shots.at(-1).to) / fps;
const clips = mergeIntoClips(buildEventWindows(storyboard.shots), fps, Number(values.pad), totalSeconds);
for (const [startSeconds, endSeconds] of clips) {
  console.log(`--clip ${startSeconds.toFixed(2)}-${endSeconds.toFixed(2)}`);
}
console.error(`${clips.length} clips, ${clips.reduce((sum, [start, end]) => sum + end - start, 0).toFixed(1)}s total`);
