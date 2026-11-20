import { mix } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BriefLinePlaceholder } from "./BriefLinePlaceholder";
import type { Input } from "../SealedHandoff.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/**
 * The intact brief slides into its enclosure. Its text never fades to simulate
 * concealment.
 */
export function HandoffBrief({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = mix(motion.reveal(frame, 36), -54, 16);
  return (
    <g data-brief-content="retained">
      <StockRect
        data-brief-paper="intact"
        x={24}
        y={y}
        width={488}
        height={246}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
      />
      {input.brief.map(({ id, line }, index) => {
        return (
          <g key={id} data-brief-line={id}>
            {input.showLabels ? (
              <FitText
                text={line}
                x={36}
                y={y + 24 + index * 48}
                width={464}
                fontSize={14}
                maxLines={2}
                normalizeWhitespace
                breakLongWords
              />
            ) : (
              <BriefLinePlaceholder y={y} index={index} />
            )}
          </g>
        );
      })}
    </g>
  );
}
