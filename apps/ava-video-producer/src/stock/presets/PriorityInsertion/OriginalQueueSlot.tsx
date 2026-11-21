import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  index: number;
};

/** Renders the original queue slot in authored paint order. */
export function OriginalQueueSlot(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={String(options.index + 1)}
        x={65}
        y={218 + 58 * options.index}
        width={30}
        fontSize={14}
        maxLines={1}
        normalizeWhitespace
        anchor="end"
        color={options.tokens.color.textMuted}
      />
      {options.input.showOriginalPositions &&
      options.index < options.input.queue.length ? (
        <StockRect
          data-original-slot={options.index}
          x={96}
          y={186 + 58 * options.index}
          width={368}
          height={56}
          rx={options.scales.corner(options.tokens.corner.cell)}
          fill="none"
          stroke={options.tokens.color.line}
          strokeDasharray={options.atomic.dash.sparse.join(" ")}
        />
      ) : undefined}
    </>
  );
}
