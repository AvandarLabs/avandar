import { DrawPath } from "../../graphics-common/DrawPath";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./TradeoffPivot.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The authored priority appears only after both sides can be read together. */
export function TradeoffCopy({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const labels = [
    {
      text: input.approach,
      y: 60,
      fontSize: 24 as const,
      color: tokens.color.text,
      opacity: motion.ramp(frame, 12, motion.hero),
    },
    {
      text: input.priorityStatement,
      y: 548,
      fontSize: 18 as const,
      color: tokens.color.textMuted,
      opacity: motion.reveal(frame, 108),
    },
  ];
  return (
    <g>
      {labels.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity} aria-label={label.text}>
            <FitText
              {...label}
              x={480}
              width={840}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
              anchor="middle"
            />
          </g>
        );
      })}
      <DrawPath
        d="M330 520 H630"
        frame={frame}
        at={108}
        duration={12}
        color={accent}
      />
    </g>
  );
}
