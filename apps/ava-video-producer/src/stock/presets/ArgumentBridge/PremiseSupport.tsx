import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SUGGESTED_DASH } from "./argumentShape";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";
/** Inputs for PremiseSupport. */
type Props = {
  joining: number;
  center: number;
  x: number;
  slotWidth: number;
  accent: string;
  premise: Input["premises"][number];
  showSupport: boolean;
  relationship: Input["relationship"];
};

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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
        <g data-individual-support={premise.id}>
          <SketchedShape
            shape={{
              kind: "line",
              x1: center,
              y1: 390,
              x2: center,
              y2: mix(joining, 390, 350),
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeWidth={width}
            strokeDasharray={dash}
          />
        </g>
      ) : null}
    </>
  );
}
