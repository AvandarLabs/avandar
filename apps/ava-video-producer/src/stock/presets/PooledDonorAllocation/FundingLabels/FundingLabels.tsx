import { FitText } from "../../../primitives/FitText/FitText";
import { getFundingLabelsLayout } from "./getFundingLabelsLayout";
import type { Input } from "../PooledDonorAllocation.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Pool restrictions, attribution and units stay outside token travel. */
export function FundingLabels(props: Readonly<Props>): ReactNode {
  const presentation = getFundingLabelsLayout(props);

  return (
    <g>
      {presentation.labels.map(([text, x, y, width, fontSize, maxLines]) => {
        return (
          <FitText
            key={`${x}:${y}`}
            text={text}
            x={x}
            y={y}
            width={width}
            fontSize={fontSize}
            maxLines={maxLines}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
      {props.input.contributions.map((donor, index) => {
        return (
          <FitText
            key={donor.id}
            text={donor.donorLabel}
            x={40 + (index * 880) / props.input.contributions.length}
            y={83}
            width={880 / props.input.contributions.length - 22}
            fontSize={12}
            maxLines={3}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </g>
  );
}
