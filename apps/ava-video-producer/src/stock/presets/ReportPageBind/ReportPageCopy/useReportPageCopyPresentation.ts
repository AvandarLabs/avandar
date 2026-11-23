import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ReportPageBind.schema.ts";
import type { ComponentProps } from "react";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  section: Input["sections"][number];
  index: number;
  showPageNumbers: boolean;
  margins: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  index: Options["index"];
  showPageNumbers: Options["showPageNumbers"];
  margins: Options["margins"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  labels: Array<ComponentProps<typeof FitText>>;
};

/**
 * Returns section heading and body slots, page numbering, and theme values for
 * `ReportPageCopy`.
 */
export function useReportPageCopyPresentation({
  section,
  index,
  showPageNumbers,
  margins,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const labels: Array<ComponentProps<typeof FitText>> = [
    {
      text: section.heading,
      x: 20,
      y: 22,
      width: 744,
      fontSize: 18 as const,
      maxLines: 2,
    },
    {
      text: section.body,
      x: 20,
      y: 54,
      width: 744,
      fontSize: 14 as const,
      maxLines: 4,
      color: tokens.color.textMuted,
    },
  ];
  return { index, showPageNumbers, margins, accent, tokens, labels };
}
