import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getRefinementFromFrame } from "./getRefinementFromFrame";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode, ComponentProps } from "react";

type HeadingSlot = Omit<ComponentProps<typeof FitText>, "x" | "width"> & {
  opacity: number;
};
type Props = { input: Input; frame: number; accent: string };

/** Fitted heading sizes, which `FitText` checks against measured widths. */
const TITLE_FONT_SIZE = 24;
const CAPTION_FONT_SIZE = 14;
/** Authored stage captions change as the presentation is refined. */
export function ChartHeadings({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const refinement = getRefinementFromFrame(frame, motion);
  const slots: HeadingSlot[] = [
    {
      text: input.headings.title,
      y: 50,
      fontSize: TITLE_FONT_SIZE,
      maxLines: 2,
      opacity: 1,
    },
    {
      text: input.headings.before,
      y: 119,
      fontSize: CAPTION_FONT_SIZE,
      maxLines: 1,
      color: tokens.color.textMuted,
      opacity: 1 - refinement,
    },
    {
      text: input.treatment === "direct-labels" ? input.headings.after : "",
      y: 119,
      fontSize: CAPTION_FONT_SIZE,
      maxLines: 1,
      color: accent,
      opacity: refinement,
    },
  ];
  return (
    <g>
      {slots.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity}>
            <FitText
              {...label}
              x={64}
              width={832}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}
