import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MeasurementLabel } from "./MeasurementLabel";
import type { Input } from "../PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  progress: number;
  isPractice: boolean;
  accent: string;
};
/** Measurement Mark for the authored scene. */
export function MeasurementMark({
  input,
  progress,
  isPractice,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return progress > 0 ? (
    <g data-measured-value={input.task.value}>
      <g data-measurement-mark={isPractice ? "practice" : "application"}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M30 60 H${30 + input.task.value * 12 * progress}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M30 54 V66 M${30 + input.task.value * 12} 54 V66`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={progress}
      />
      <MeasurementLabel task={input.task} />
    </g>
  ) : undefined;
}
