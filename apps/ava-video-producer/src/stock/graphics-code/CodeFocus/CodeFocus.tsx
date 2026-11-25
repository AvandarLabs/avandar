import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Pill } from "../../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BADGE_TOP, BADGE_WIDTH } from "./CodeFocus.constants";
import { FocusedCodeWindow } from "./FocusedCodeWindow";
import { useHighlightLine } from "./useHighlightLine";
import type { Props } from "./CodeFocus.types";
import type { ReactNode } from "react";

/** Renders CodeFocus within the authored stock graphics. */
export function CodeFocus({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const line = useHighlightLine({
    highlight: input.highlight,
    frame,
  });
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].codeFocus,
        })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - tokens.layout.graphic.margin - BADGE_WIDTH}
        y={BADGE_TOP}
        width={BADGE_WIDTH}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].exampleCode,
        })}
        color={accent}
      />
      <FocusedCodeWindow {...{ input, accent, line }} />
    </g>
  );
}
