import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** The same question and caption frame both alternatives. */
export function ContrastHeading({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const headings = [
    {
      text: input.question,
      y: 56,
      fontSize: 24 as const,
      maxLines: 3,
      color: tokens.color.text,
      opacity: ramp(frame, 18, motion.hero, motion.reveal.easing),
    },
    {
      text: input.comparisonLabel,
      y: 572,
      fontSize: 16 as const,
      maxLines: 2,
      color: tokens.color.textMuted,
      opacity: motion.reveal(frame, 108),
    },
  ];
  return (
    <g>
      {headings.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity} aria-label={label.text}>
            <FitText
              {...label}
              x={480}
              width={840}
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
