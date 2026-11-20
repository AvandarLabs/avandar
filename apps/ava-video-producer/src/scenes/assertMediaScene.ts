import {
  assertFrame,
  assertRect,
  assertUnit,
  sceneBounds,
} from "./layout/layout";
import type { MediaSceneProps } from "./scenes.types";

type MediaSceneGeometry = Required<
  Pick<
    MediaSceneProps,
    | "trimBefore"
    | "objectPosition"
    | "crop"
    | "kind"
    | "fit"
    | "width"
    | "height"
    | "callouts"
  >
>;

/**
 * Reject invalid media geometry, fit modes, and ambiguous callout identities.
 */
export function assertMediaScene({
  trimBefore,
  objectPosition,
  crop,
  kind,
  fit,
  width,
  height,
  callouts,
}: MediaSceneGeometry): void {
  assertFrame(trimBefore, "trimBefore");
  assertUnit(objectPosition.x, "objectPosition.x");
  assertUnit(objectPosition.y, "objectPosition.y");
  assertRect(crop, "crop");
  if (kind !== "image" && kind !== "video")
    throw new Error("Media kind must be image or video");
  if (fit !== "contain" && fit !== "cover")
    throw new Error("Media fit must be contain or cover");
  sceneBounds(width, height); // Apply the shared minimum-size checks.
  const ids = new Set<string>();
  callouts.forEach((callout) => {
    assertRect(callout, `callout ${callout.id}`);
    assertFrame(callout.startFrame, "callout.startFrame");
    assertFrame(callout.endFrame, "callout.endFrame");
    if (
      !callout.id ||
      ids.has(callout.id) ||
      !callout.label.trim() ||
      callout.endFrame <= callout.startFrame
    )
      throw new Error(`Invalid or duplicate media callout: ${callout.id}`);
    ids.add(callout.id);
  });
}
