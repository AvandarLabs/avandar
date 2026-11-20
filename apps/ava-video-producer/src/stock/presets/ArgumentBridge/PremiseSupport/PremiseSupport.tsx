import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SUGGESTED_DASH } from "../argumentShape";
import { type Props } from "./PremiseSupportShared.types";
import { SupportPost } from "./SupportPost";
import type { ReactNode } from "react";
/**
 * Joining arms connect one premise to the deck, with an optional center post.
 */
export function PremiseSupport({
  joining,
  center,
  x,
  slotWidth,
  accent,
  premise,
  showSupport,
  relationship,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const dash = relationship === "suggests" ? SUGGESTED_DASH : undefined;
  const width = scales.stroke(tokens.stroke.emphasis);
  return (
    <>
      <g data-premise-join={premise.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${center} 410 V390 M${center} 390 H${mix(joining, center, x + 4)} V${mix(joining, 390, 350)} M${center} 390 H${mix(joining, center, x + slotWidth - 4)} V${mix(joining, 390, 350)}`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={width}
          fill="none"
          strokeDasharray={dash}
          opacity={joining}
        />
      </g>
      {showSupport ? (
        <SupportPost {...{ joining, center, accent, premise, dash, width }} />
      ) : null}
    </>
  );
}
