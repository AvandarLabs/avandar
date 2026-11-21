import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ProvenancePeelback.schema.ts";
import type { ComponentProps } from "react";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  source: Input["sources"][number];
  selected: boolean;
  showLocators: boolean;
  height: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  source: Options["source"];
  height: Options["height"];
  slots: Array<ComponentProps<typeof FitText>>;
};

/**
 * Returns source title, optional locator, and passage text slots for
 * `SourcePassageCopy`.
 */
export function useSourcePassageCopyPresentation({
  source,
  selected,
  showLocators,
  height,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const slots: Array<ComponentProps<typeof FitText>> = [
    {
      text: source.title,
      x: 16,
      y: 26,
      width: 368,
      fontSize: 14 as const,
      maxLines: 2,
      color: selected ? accent : tokens.color.text,
    },
    ...(showLocators
      ? [
          {
            text: source.locator,
            x: 16,
            y: 64,
            width: 368,
            fontSize: 12 as const,
            maxLines: 1,
            color: tokens.color.textMuted,
          },
        ]
      : []),
    {
      text: source.excerpt,
      x: 16,
      y: selected ? 92 : 82,
      width: 368,
      fontSize: 14 as const,
      maxLines: 8,
    },
  ];
  return { source, height, slots };
}
