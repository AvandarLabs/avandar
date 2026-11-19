import { mix, ramp } from "../../../motion";
import { DrawPath } from "../../graphics-common/DrawPath";
import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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

/** Frames between neighbouring criteria arriving. */
const ROW_STAGGER_FRAMES = 12;

function _getLabelsFromCriterion({
  row,
  y,
  color,
}: {
  row: Readonly<Input["criteria"][number]>;
  y: number;
  color: Readonly<{ text: string; textMuted: string }>;
}) {
  return [
    {
      text: row.label,
      x: 480,
      y: y - 3,
      width: 144,
      fontSize: 14 as const,
      color: color.textMuted,
    },
    ...[row.leftText, row.rightText].map((text, side) => {
      return {
        text,
        x: 224 + side * 512,
        y: y - 9,
        width: 288,
        fontSize: 18 as const,
        color: color.text,
      };
    }),
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const y = 274 + index * 100;
  const stagger = index * motion.scale(ROW_STAGGER_FRAMES);
  const entrance = ramp(
    frame,
    36 + stagger,
    motion.hero,
    motion.entrance.easing,
  );
  const labels = _getLabelsFromCriterion({ row, y, color: tokens.color });
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
            at={42 + stagger}
            color={tokens.color.line}
          />
        </g>
      ) : null}
      {labels.map((label, side) => {
        return (
          <g key={side} aria-label={label.text}>
            <FitText
              {...label}
              maxLines={4}
              breakLongWords
              normalizeWhitespace
              anchor="middle"
            />
          </g>
        );
      })}
    </g>
  );
}
