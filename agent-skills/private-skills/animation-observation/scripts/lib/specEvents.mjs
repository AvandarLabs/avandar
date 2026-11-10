/**
 * Reads shot timing from a motion spec's storyboard script or from a
 * producer `storyboard.json`, and lists the frames worth a close look:
 * windows around every shot boundary, transition, camera move, and short
 * in-shot motion, and one representative still per shot.
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

/** Motions at or under this length get a close-up even inside a shot. */
const SHORT_MOTION_FRAMES = 20;

/** Reads camera moves as `[from, to]`, structured or as "f1212 to f1224" text. */
function readCameraWindows(camera) {
  if (!camera || camera === "none") return [];
  const moves = Array.isArray(camera) ? camera : [camera];
  return moves.flatMap((move) => {
    if (typeof move === "object" && Number.isFinite(move.from)) return [[move.from, move.to]];
    const match = String(move).match(/f?(\d+)\s*(?:to|-|–)\s*f?(\d+)/);
    return match ? [[Number(match[1]), Number(match[2])]] : [];
  });
}

/** Reads short or `closeup`-flagged element motions as `[from, to]`. */
function readShortMotionWindows(shot) {
  return (shot.elements ?? []).flatMap((element) =>
    (element.motions ?? [])
      .filter((motion) => Number.isFinite(motion.from) && Number.isFinite(motion.to))
      .filter((motion) => motion.closeup || motion.to - motion.from <= SHORT_MOTION_FRAMES)
      .map((motion) => [motion.from, motion.to]),
  );
}

/**
 * Collects `[startFrame, endFrame]` windows around boundaries, transitions,
 * camera moves, and short in-shot motions.
 */
function buildEventWindows(shots) {
  return shots.flatMap((shot, index) => {
    const windows = [...readCameraWindows(shot.camera), ...readShortMotionWindows(shot)];
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
