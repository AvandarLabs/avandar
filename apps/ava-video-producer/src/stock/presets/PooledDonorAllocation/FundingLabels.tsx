import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Pool restrictions, attribution and units stay outside token travel. */
export function FundingLabels({ input }: Readonly<Props>): ReactNode {
  const labels: Array<[string, number, number, number, FitTextSize, number]> = [
    [input.scenarioCaption, 40, 32, 880, 16, 2],
    [input.labels.pool, 40, 220, 190, 12, 3],
    [input.labels.remaining, 40, 277, 160, 12, 4],
    [input.labels.unit, 40, 548, 430, 12, 1],
    [input.labels.allocated, 500, 548, 420, 12, 1],
    [input.labels.coordinator, 40, 565, 280, 12, 3],
    [input.labels.earmarked, 340, 565, 280, 12, 3],
    [input.labels.flexible, 640, 565, 280, 12, 3],
  ];
  return (
    <g>
      {labels.map(([text, x, y, width, fontSize, maxLines], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={fontSize}
          maxLines={maxLines}
          normalizeWhitespace
          breakLongWords
        />
      ))}
      {input.contributions.map((donor, index) => (
        <FitText
          key={donor.id}
          text={donor.donorLabel}
          x={40 + (index * 880) / input.contributions.length}
          y={83}
          width={880 / input.contributions.length - 22}
          fontSize={12}
          maxLines={3}
          normalizeWhitespace
          breakLongWords
        />
      ))}
    </g>
  );
}
