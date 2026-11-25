import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

const RIBBON_WIDTH = 24;
type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  transfer: number;
  retained: number;
  retainedShare: number;
};
/** Separates retained and released carbon into physical routes. */
export function CarbonTransferRibbons({
  input,
  accent,
  tokens,
  scales,
  transfer,
  retained,
  retainedShare,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M260 360 V${Motion.mix({ t: transfer, from: 360, to: 465 })} H${Motion.mix({ t: transfer, from: 260, to: 345 })}`,
        }}
        profile={tokens.sketch.shape}
        data-retained-ribbon
        data-tonnes={retained}
        stroke={accent}
        strokeWidth={scales.stroke(RIBBON_WIDTH * retainedShare)}
        fill="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M260 360 H${Motion.mix({ t: transfer, from: 260, to: 520 })} V${Motion.mix({ t: transfer, from: 360, to: 270 })}`,
        }}
        profile={tokens.sketch.shape}
        data-released-ribbon
        data-tonnes={input.capture.releasedTonnesCO2}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(
          RIBBON_WIDTH *
            (input.capture.releasedTonnesCO2 / input.capture.capturedTonnesCO2),
        )}
        fill="none"
      />
    </>
  );
}
