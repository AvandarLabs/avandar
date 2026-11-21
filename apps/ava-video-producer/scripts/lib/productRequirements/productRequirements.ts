import type { Storyboard } from "../../../src/storyboard/schema/schema";
/** Product bridge and WebGL requirements, including nested continuity beats. */
export function productRequirements(plan: Storyboard): {
  needsProduct: boolean;
  needsMap: boolean;
} {
  const features = plan.shots.flatMap((shot) => {
    if (shot.scene === "avandar") {
      return [shot.props.feature];
    }
    return shot.scene === "continuity"
      ? shot.props.beats.flatMap(({ content }) => {
          return content.kind === "product" || content.kind === "composite"
            ? [content.segment.feature]
            : [];
        })
      : [];
  });
  return {
    needsProduct: features.length > 0,
    needsMap: features.includes("map"),
  };
}
