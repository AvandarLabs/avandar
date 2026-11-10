/**
 * Reads a motion spec's storyboard script and lists the frames a refine pass
 * should look at closely: windows around every shot boundary and transition,
 * and one representative still per shot.
 */
import { readFile } from "node:fs/promises";
import { requireFromProducer } from "./videoTools.mjs";

const { parse } = requireFromProducer("yaml");

/** Returns the storyboard script from the spec's ```yaml block that has `shots`. */
export async function readStoryboard(specPath) {
  const markdown = await readFile(specPath, "utf8");
  const yamlBlocks = [...markdown.matchAll(/```yaml\n([\s\S]*?)```/g)].map((match) => match[1]);
  const storyboard = yamlBlocks
    .map((block) => {
      try {
        return parse(block);
      } catch {
        return undefined;
      }
    })
    .find((doc) => doc?.shots);
  if (!storyboard) throw new Error(`No \`\`\`yaml storyboard with \`shots\` in ${specPath}`);
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

/**
 * Pads event windows by `padFrames` on both sides, clamps them to the video,
 * and merges overlaps. Returns `[startFrame, endFrame)` pairs.
 */
export function buildBoundaryClips(shots, padFrames, numFrames) {
  const clips = buildEventWindows(shots)
    .map(([startFrame, endFrame]) => [
      Math.max(0, startFrame - padFrames),
      Math.min(numFrames, endFrame + padFrames),
    ])
    .sort((left, right) => left[0] - right[0]);
  return clips.reduce((merged, clip) => {
    const lastClip = merged.at(-1);
    if (lastClip && clip[0] <= lastClip[1]) lastClip[1] = Math.max(lastClip[1], clip[1]);
    else merged.push([...clip]);
    return merged;
  }, []);
}

/**
 * Picks one still per shot, two thirds of the way in, when entrances have
 * landed and exits have not started.
 */
export function buildShotStills(shots) {
  return shots.map((shot) => ({
    shotId: shot.id,
    frame: Math.round(shot.from + (shot.to - shot.from) * (2 / 3)),
  }));
}
