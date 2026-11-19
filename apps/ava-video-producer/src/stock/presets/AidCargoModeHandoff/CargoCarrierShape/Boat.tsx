import { SketchedShape } from "../../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { accent: string };
/** Water transport silhouette. */
export function Boat({ accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M-100 -15 H100 L75 20 H-75 Z M-90 -15 V-46 H-55 V-15",
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M-115 30 Q-85 20 -55 30 T5 30 T65 30 T120 30",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.accentAlt}
      />
    </>
  );
}
