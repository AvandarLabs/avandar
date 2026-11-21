import { SceneGeometry } from "./layout/SceneGeometry";
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
  SceneGeometry.assertFrame({
    value: trimBefore,
    name: "trimBefore",
  });
  SceneGeometry.assertUnit({
    value: objectPosition.x,
    name: "objectPosition.x",
  });
  SceneGeometry.assertUnit({
    value: objectPosition.y,
    name: "objectPosition.y",
  });
  SceneGeometry.assertRect({
    rect: crop,
    name: "crop",
  });
  if (kind !== "image" && kind !== "video") {
    throw new Error("Media kind must be image or video");
  }
  if (fit !== "contain" && fit !== "cover") {
    throw new Error("Media fit must be contain or cover");
  }
  SceneGeometry.sceneBounds({
    width,
    height,
  }); // Apply the shared minimum-size checks.
  _assertMediaCallouts(callouts);
}

/** Rejects invalid callout geometry, intervals and identities. */
function _assertMediaCallouts(callouts: MediaSceneGeometry["callouts"]): void {
  const ids = new Set<string>();
  callouts.forEach((callout) => {
    SceneGeometry.assertRect({
      rect: callout,
      name: `callout ${callout.id}`,
    });
    SceneGeometry.assertFrame({
      value: callout.startFrame,
      name: "callout.startFrame",
    });
    SceneGeometry.assertFrame({
      value: callout.endFrame,
      name: "callout.endFrame",
    });
    if (
      !callout.id ||
      ids.has(callout.id) ||
      !callout.label.trim() ||
      callout.endFrame <= callout.startFrame
    ) {
      throw new Error(`Invalid or duplicate media callout: ${callout.id}`);
    }
    ids.add(callout.id);
  });
}
