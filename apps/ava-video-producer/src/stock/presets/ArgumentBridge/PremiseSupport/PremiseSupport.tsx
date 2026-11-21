import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SUGGESTED_DASH } from "../argumentShape";
import { SupportPost } from "./SupportPost";
import type { Props } from "./PremiseSupportShared.types";
import type { ReactNode } from "react";

type GetPremiseJoiningPathOptions = {
  joining: Readonly<Props>["joining"];
  center: Readonly<Props>["center"];
  x: Readonly<Props>["x"];
  slotWidth: Readonly<Props>["slotWidth"];
};

/** Samples the premise joining path for the current authored frame. */
function _getPremiseJoiningPath({
  joining,
  center,
  x,
  slotWidth,
}: Readonly<GetPremiseJoiningPathOptions>): { kind: "path"; d: string } {
  return {
    kind: "path",
    d: `M${center} 410 V390 M${center} 390 H${Motion.mix({
      t: joining,
      from: center,
      to: x + 4,
    })} V${Motion.mix({
      t: joining,
      from: 390,
      to: 350,
    })} M${center} 390 H${Motion.mix({
      t: joining,
      from: center,
      to: x + slotWidth - 4,
    })} V${Motion.mix({
      t: joining,
      from: 390,
      to: 350,
    })}`,
  };
}

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
          shape={_getPremiseJoiningPath({ joining, center, x, slotWidth })}
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
