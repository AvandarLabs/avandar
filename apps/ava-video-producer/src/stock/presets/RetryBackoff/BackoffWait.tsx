import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BackoffDelay } from "./BackoffDelay";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; x: number; width: number };
/** A bracket encodes a supplied wait without widening for its caption. */
export function BackoffWait({
  input,
  index,
  x,
  width,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const waitX = 40 + index * 290;
  return (
    <g>
      <StockRect
        data-wait-index={index}
        x={x}
        y={348}
        width={width}
        height={12}
        fill="none"
        stroke={tokens.color.inactive}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + width / 2} 348 V255 L${waitX + 125} 240`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
      <FitText
        text={input.outcomeLabels.wait}
        x={waitX}
        y={160}
        width={250}
        maxLines={2}
        fontSize={14}
        normalizeWhitespace
        breakLongWords
      />
      {input.showDelayValues ? (
        <BackoffDelay input={input} index={index} x={waitX} />
      ) : undefined}
    </g>
  );
}
