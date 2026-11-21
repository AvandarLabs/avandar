import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { FeedbackNoteNoteCornerValue } from "../FeedbackNote";
import type { ReactNode } from "react";

type Props = {
  index: number;
  x: ReturnType<typeof Motion.mix>;
  y: ReturnType<typeof Motion.mix>;
  detach: ReturnType<typeof Motion.ramp>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  noteCorner: FeedbackNoteNoteCornerValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the feedback round with authored geometry. */
export function FeedbackNoteFeedbackRound({
  index,
  x,
  y,
  detach,
  scales,
  noteCorner: NOTE_CORNER,
  tokens,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-feedback-round={index}
      x={x}
      y={y}
      width={Motion.mix({ t: detach, from: 320, to: 390 })}
      height={78}
      rx={scales.corner(NOTE_CORNER)}
      fill={tokens.color.elevated}
      stroke={tokens.color.highlight}
      strokeOpacity={Motion.mix({
        t: detach,
        from: 1,
        to: atomic.opacity["40"],
      })}
    />
  );
}
