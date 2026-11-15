import { propEq, propNotEq, isDefined } from "@avandar/utils";
import { Text } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Inputs for ObservationCaptions. */
type Props = { input: Input };

/** Point labels and area totals explicitly retain their different supports. */
export function ObservationCaptions({ input }: Readonly<Props>): ReactNode {
  const observed =
    input.cells.filter(propNotEq("value", null)).length *
    input.metric.cellAreaHa;
  const missing =
    input.cells.filter(propEq("value", null)).length * input.metric.cellAreaHa;
  const labels = [
    { text: input.copy.disclaimer, x: 32, y: 252, width: 190, maxLines: 6 },
    {
      text: input.decision.actorLabel,
      x: 270,
      y: 426,
      width: 310,
      maxLines: 3,
    },
    {
      text: input.decision.actionLabel,
      x: 600,
      y: 426,
      width: 328,
      maxLines: 3,
    },
    input.fieldChecks.length
      ? { text: input.copy.fieldCheck, x: 32, y: 347, width: 190, maxLines: 4 }
      : undefined,
    input.fieldChecks.length
      ? {
          text: input.copy.pointSupport,
          x: 32,
          y: 409,
          width: 190,
          maxLines: 4,
        }
      : undefined,
  ].filter(isDefined);
  return (
    <g>
      {labels.map(({ text, x, y, width, maxLines }, index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={12}
          maxLines={maxLines}
          breakLongWords
          normalizeWhitespace
        />
      ))}
      {input.fieldChecks.map((check, index) => (
        <g key={check.id}>
          <Text x={32 + index * 310} y={479} size={12} fill={STOCK.orange}>
            {index + 1}
          </Text>
          <FitText
            text={check.label}
            x={52 + index * 310}
            y={479}
            width={270}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <FitText
            text={String(check.value)}
            x={52 + index * 310}
            y={530}
            width={270}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ))}
      {input.showCoverageTotals ? (
        <g
          data-coverage="true"
          data-observed-area={observed}
          data-missing-area={missing}
        >
          {[
            { label: input.copy.observed, value: observed },
            { label: input.copy.missing, value: missing },
          ].map(({ label, value }, index) => (
            <g key={index}>
              <FitText
                text={label}
                x={32 + index * 466}
                y={546}
                width={428}
                fontSize={12}
                maxLines={3}
                breakLongWords
                normalizeWhitespace
              />
              <FitText
                text={String(value)}
                x={32 + index * 466}
                y={594}
                width={290}
                fontSize={12}
                maxLines={1}
                breakLongWords
                normalizeWhitespace
              />
              <FitText
                text={input.copy.areaUnit}
                x={340 + index * 466}
                y={594}
                width={120}
                fontSize={12}
                maxLines={1}
                breakLongWords
                normalizeWhitespace
              />
            </g>
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
