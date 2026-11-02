import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";
/** Authored context and labels for the fixed uncertainty ruler. */
export type Props = { input: Input };
/** Renders static context and finite ruler endpoints. */
export function UncertaintyAxis({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.contextLabel}
        x={100}
        y={56}
        width={760}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
      <FitText
        text={input.estimate.label}
        x={100}
        y={128}
        width={760}
        fontSize={20}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <path
        d="M100 300 H860 M100 288 V312 M860 288 V312"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <FitText
        text={String(input.axis.min)}
        x={100}
        y={238}
        width={200}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
      <FitText
        text={String(input.axis.max)}
        x={860}
        y={238}
        width={200}
        fontSize={12}
        maxLines={2}
        anchor="end"
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
    </>
  );
}
