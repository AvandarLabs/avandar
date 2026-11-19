import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { hasDrawer: boolean };
/** Saved impressions sit in a local drawer or a labeled margin recess. */
export function RevisionDrawer({ hasDrawer }: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {hasDrawer ? (
        <SketchedShape
          shape={{ kind: "path", d: "M30 385 V582 H930 V385 M30 390 H930" }}
          profile={tokens.sketch.shape}
          data-storage-drawer="true"
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M30 382 V582 H930" }}
          profile={tokens.sketch.shape}
          data-storage-recess="true"
          fill="none"
          stroke={tokens.color.line}
          strokeDasharray={atomic.dash.medium.join(" ")}
        />
      )}
    </g>
  );
}
