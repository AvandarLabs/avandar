import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { PipelineStrip } from "./PipelineStrip";
import { SplicePreview } from "./SplicePreview";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";
/** Complete splice props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };
/** Fit a single authored operation into the requested middle gap. */
export function PipelineStepSplice({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.title}
        x={64}
        y={50}
        width={832}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <g opacity={ramp(frame, 18, 12)}>
        <FitText
          text={input.editLabel}
          x={480}
          y={132}
          width={784}
          fontSize={14}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={STOCK.muted}
        />
      </g>
      <PipelineStrip input={input} frame={frame} accent={accent} />
      {input.showPreview ? (
        <SplicePreview preview={input.preview} frame={frame} accent={accent} />
      ) : undefined}
    </g>
  );
}
