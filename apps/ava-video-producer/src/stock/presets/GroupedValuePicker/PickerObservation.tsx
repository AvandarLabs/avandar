import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; frame: number; accent: string };
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/**
 * Ordered source tile with literal identity, nullable value and selection edge.
 */
export function PickerObservation({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const observation = input.observations[index],
    x = 48 + index * 144;
  const selected = input.rule === "first" && index === 0 && frame >= 56;
  return (
    <g
      data-picker-observation={observation.id}
      opacity={ramp(frame, 13 + index * 2, 30)}
    >
      <StockRect
        data-observation-tile={observation.id}
        x={x}
        y={160}
        width={144}
        height={132}
        fill={STOCK.surface}
        stroke={selected ? accent : STOCK.line}
        strokeWidth={selected ? 3 : 1}
      />
      {Array.from(GRAPHEMES.segment(observation.id), ({ segment }) => segment)
        .reduce<string[]>((lines, segment, graphemeIndex) => {
          const lineIndex = Math.floor(graphemeIndex / 6);
          lines[lineIndex] = `${lines[lineIndex] ?? ""}${segment}`;
          return lines;
        }, [])
        .map((line, lineIndex) => (
          <LiteralDataText
            key={lineIndex}
            value={line}
            x={x + 8}
            y={180 + lineIndex * 16}
          />
        ))}
      {observation.value === null ? (
        <LabelSlots labels={[["∅", x + 120, 180, 16, 12, 1]]} />
      ) : null}
      <LabelSlots
        labels={[
          [
            observation.value === null
              ? input.labels.missing
              : String(observation.value),
            x + 8,
            224,
            128,
            12,
            5,
          ],
        ]}
      />
      <path
        d={`M${x + 12} 315 H${x + 132} m-7 -5 l7 5 l-7 5`}
        fill="none"
        stroke={STOCK.line}
      />
    </g>
  );
}
