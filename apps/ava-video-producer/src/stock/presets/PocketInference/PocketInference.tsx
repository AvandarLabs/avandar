import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DeviceCopy } from "./DeviceCopy";
import { InternalWriting } from "./InternalWriting";
import { ModelCartridge } from "./ModelCartridge";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";
/** Complete contained computation illustration input. */
export type Props = GraphicProps & { input: Input };
/**
 * The complete illustrated computation stays inside one stable device
 * silhouette.
 */
export function PocketInference({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const phone = input.deviceShape === "phone";
  const laptop = input.deviceShape === "laptop";
  return (
    <g>
      <StockRect
        data-device-boundary={input.deviceShape}
        x={phone ? 174 : 142}
        y={90}
        width={phone ? 612 : 676}
        height={414}
        rx={phone ? 38 : 18}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {laptop ? (
        <SketchedShape
          shape={{ kind: "path", d: "M142 504 h676 l30 8 h-736 z" }}
          profile={tokens.sketch.shape}
          fill={tokens.color.elevated}
          stroke={tokens.color.line}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: phone ? "M438 100 h84" : "M466 100 h28" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      )}
      <g data-processing-content="inside-device">
        <ModelCartridge {...{ frame, input, accent }} />
        <InternalWriting {...{ frame, input, accent }} />
      </g>
      <DeviceCopy input={input} />
    </g>
  );
}
