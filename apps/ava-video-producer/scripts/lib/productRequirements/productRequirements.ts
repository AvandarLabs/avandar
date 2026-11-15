import type { Storyboard } from "../../../src/storyboard/schema/schema";

/** Product bridge and WebGL requirements, including nested continuity beats. */
export function productRequirements(plan: Storyboard) {
  const features = plan.shots.flatMap((shot) => {
    if (shot.scene === "avandar") return [shot.props.feature];
    if (shot.scene !== "continuity") return [];
    return shot.props.beats.flatMap(({ content }) =>
      content.kind === "product" || content.kind === "composite"
        ? [content.segment.feature]
        : [],
    );
  });
  return {
    needsProduct: features.length > 0,
    needsMap: features.includes("map"),
  };
}
