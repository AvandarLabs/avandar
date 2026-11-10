/**
 * Reads shot timing from a motion spec's storyboard script or from a
 * producer `storyboard.json`, and lists the frames worth a close look:
 * windows around every shot boundary and transition, and one
 * representative still per shot.
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

/**
 * Converts a producer storyboard plan to the spec's shot shape. A plan's
 * transition occupies the first `transitionInFrames` of the incoming shot.
 */
function readShotsFromPlan(plan) {
  let startFrame = 0;
  return plan.shots.map((shot, index) => {
    const shotEntry = { id: shot.id, from: startFrame, to: startFrame + shot.durationInFrames };
    startFrame = shotEntry.to;
    const nextShot = plan.shots[index + 1];
    const transitionFrames = nextShot?.transitionInFrames ?? 0;
    if (nextShot && transitionFrames > 0) {
      shotEntry.transition_out = { from: shotEntry.to, to: shotEntry.to + transitionFrames };
    }
    return shotEntry;
  });
}

/** Reads shots from a `.json` producer plan or a Markdown motion spec. */
export async function readShots(filePath) {
  if (filePath.endsWith(".json")) {
    return readShotsFromPlan(JSON.parse(await readFile(filePath, "utf8")));
  }
  return (await readStoryboard(filePath)).shots;
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
