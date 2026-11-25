import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReportPageGeometryFromInputAndFrame } from "../getReportPageGeometryFromInputAndFrame";
import type { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ReportPageBind.schema.ts";
import type { ComponentProps } from "react";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  x: number;
  y: number;
  margins: number;
  labels: Array<ComponentProps<typeof FitText>>;
};

/**
 * Returns report heading text slots, page position, and margins for
 * `ReportHeader`.
 */
export function useReportHeaderPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    motion,
    input,
    frame,
    index: 0,
  });
  const labels: Array<ComponentProps<typeof FitText>> = [
    {
      text: input.reportTitle,
      x,
      y: 44,
      width: 770,
      fontSize: 24 as const,
      maxLines: 2,
    },
    {
      text: input.byline,
      x,
      y: 106,
      width: 620,
      fontSize: 14 as const,
      maxLines: 1,
      color: tokens.color.textMuted,
    },
    {
      text: input.formatLabel,
      x: x + 768,
      y: 106,
      width: 220,
      fontSize: 14 as const,
      maxLines: 1,
      anchor: "end",
      color: accent,
    },
  ];
  return { frame, motion, x, y, margins, labels };
}
