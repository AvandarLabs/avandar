import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

/** The dash of the alignment guides. */
const ALIGNMENT_DASH = "3 4";
type Props = { input: Input };
/** Alignment Guides for the authored scene. */
export function AlignmentGuides({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return input.showAlignmentGuides ? (
    <g data-alignment-guide={input.task.value}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M30 24 V75 M${30 + input.task.value * 12} 24 V75`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={ALIGNMENT_DASH}
      />
    </g>
  ) : undefined;
}
