import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { PreviewValue } from "./PreviewValue";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Props = { preview: Input["preview"]; frame: number; accent: string };
/** The supplied example is displayed literally. No operation executes here. */
export function SplicePreview({
  preview,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const unfolding = ramp(frame, 98, 34);
  return (
    <g data-preview="authored" opacity={unfolding}>
      <rect
        x={64}
        y={416}
        width={832}
        height={mix(unfolding, 12, 154)}
        rx={5}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <PreviewValue
        label={preview.inputLabel}
        value={preview.inputValue}
        isOutput={false}
        accent={accent}
      />
      <path d="M88 488H872" stroke={STOCK.line} />
      <PreviewValue
        label={preview.outputLabel}
        value={preview.outputValue}
        isOutput
        accent={accent}
      />
    </g>
  );
}
