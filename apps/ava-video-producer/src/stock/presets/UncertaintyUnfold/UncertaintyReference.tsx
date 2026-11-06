import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";
/** Optional reference blade coordinates and its reveal progress. */
export type Props = {
  input: Input;
  referenceProgress: number;
  referenceX: number;
};
/** Renders the supplied comparison reference when present. */
export function UncertaintyReference({
  input,
  referenceProgress,
  referenceX,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.reference ? (
        <g opacity={referenceProgress}>
          <line
            data-reference-blade="true"
            x1={referenceX}
            x2={referenceX}
            y1={mix(referenceProgress, 200, 264)}
            y2={mix(referenceProgress, 256, 336)}
            stroke={STOCK.orange}
            strokeWidth={3}
          />
          <path
            d={`M${referenceX} 264 L480 220`}
            stroke={STOCK.orange}
            fill="none"
          />
          <FitText
            text={input.reference.label}
            x={480}
            y={182}
            width={760}
            fontSize={16}
            maxLines={2}
            anchor="middle"
            breakLongWords
            normalizeWhitespace
            color={STOCK.orange}
          />
        </g>
      ) : undefined}
    </>
  );
}
