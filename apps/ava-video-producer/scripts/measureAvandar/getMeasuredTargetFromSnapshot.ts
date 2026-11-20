import { isUndefined } from "@avandar/utils";
import type {
  Rect,
  StageBounds,
  TargetCandidate,
  TargetSnapshot,
} from "./measureAvandar.types";

/** Why a candidate cannot be measured, or undefined when it can. */
function _getRejectionFromCandidate(
  candidate: Readonly<TargetCandidate>,
  stage: Readonly<StageBounds>,
): string | undefined {
  const x = candidate.rect.x + candidate.rect.width / 2;
  const y = candidate.rect.y + candidate.rect.height / 2;
  if (candidate.isHidden) {
    return "Hidden or zero-sized element";
  }
  if (x < stage.x || x >= stage.right || y < stage.y || y >= stage.bottom) {
    return "Element center falls outside the film stage";
  }
  return candidate.occluder && !candidate.isCanvasProjection
    ? `Center occluded by ${candidate.occluder}`
    : undefined;
}

/**
 * Gets the first visible, unoccluded candidate's centre and bounds relative
 * to the film stage, or the reasons no candidate qualified. Use it to turn
 * what the page reported about a target into a cursor destination.
 */
export function getMeasuredTargetFromSnapshot(
  snapshot: Readonly<TargetSnapshot> | undefined,
): { x: number; y: number; rect: Rect } | { reason: string } {
  if (!snapshot) {
    return { reason: "Film stage is absent" };
  }
  const { stage, candidates } = snapshot;
  const rejections = candidates.map((candidate) => {
    return _getRejectionFromCandidate(candidate, stage);
  });
  const index = rejections.findIndex(isUndefined);
  if (index < 0) {
    return {
      reason: candidates.length
        ? rejections.join("; ")
        : "No matching data-video-target",
    };
  }
  const round = (value: number) => {
    return Math.round(value * 100) / 100;
  };
  const { rect } = candidates[index];
  return {
    x: round(rect.x + rect.width / 2 - stage.x),
    y: round(rect.y + rect.height / 2 - stage.y),
    rect: {
      x: round(rect.x - stage.x),
      y: round(rect.y - stage.y),
      width: round(rect.width),
      height: round(rect.height),
    },
  };
}
