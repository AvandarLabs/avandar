import { mix, ramp } from "../../../motion";
import { DrawPath } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { ContrastBand } from "./ContrastBand";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["criteria"][number];
  index: number;
  frame: number;
  accent: string;
  isFocused: boolean;
  showBrackets: boolean;
};

function _getLabelsFromCriterion({
  row,
  y,
}: {
  row: Readonly<Input["criteria"][number]>;
  y: number;
}) {
  return [
    {
      text: row.label,
      x: 480,
      y: y - 3,
      width: 144,
      fontSize: 14 as const,
      color: STOCK.muted,
    },
    ...[row.leftText, row.rightText].map((text, side) => ({
      text,
      x: 224 + side * 512,
      y: y - 9,
      width: 288,
      fontSize: 18 as const,
      color: STOCK.text,
    })),
  ];
}

/**
 * Paired baselines keep every criterion readable during the resolved contrast.
 */
export function ContrastRow({
  row,
  index,
  frame,
  accent,
  isFocused,
  showBrackets,
}: Readonly<Props>): ReactNode {
  const y = 274 + index * 100;
  const entrance = ramp(frame, 36 + index * 12, 18);
  const labels = _getLabelsFromCriterion({ row, y });
  return (
    <g
      data-criterion={row.id}
      opacity={entrance}
      transform={`translate(0 ${mix(entrance, 10, 0)})`}
    >
      {isFocused ? (
        <ContrastBand
          criterionId={row.id}
          y={y}
          frame={frame}
          accent={accent}
        />
      ) : null}
      {showBrackets ? (
        <g data-pair-bracket={row.id}>
          <DrawPath
            d={`M388 ${y - 24} H404 V${y + 62} H388 M572 ${y - 24} H556 V${y + 62} H572`}
            frame={frame}
            at={42 + index * 12}
            color={STOCK.line}
          />
        </g>
      ) : null}
      {labels.map((label, side) => (
        <g key={side} aria-label={label.text}>
          <FitText
            {...label}
            maxLines={4}
            breakLongWords
            normalizeWhitespace
            anchor="middle"
          />
        </g>
      ))}
    </g>
  );
}
