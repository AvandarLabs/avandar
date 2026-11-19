import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
/** Approach Trace for the authored scene. */
export function ApproachTrace({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return input.showApproachTrace ? (
    <SketchedShape
      shape={{ kind: "path", d: "M160 250 V490 H605" }}
      profile={tokens.sketch.shape}
      data-approach-trace="true"
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      strokeDasharray="5 7"
      opacity={progress * 0.5}
    />
  ) : undefined;
}
