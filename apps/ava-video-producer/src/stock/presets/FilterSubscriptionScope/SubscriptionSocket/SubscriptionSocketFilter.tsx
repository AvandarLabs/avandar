import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  corner: number;
  socket: number;
};

/** Renders the subscription socket filter in authored paint order. */
export function SubscriptionSocketFilter(options: Readonly<Props>): ReactNode {
  return (
    <g data-filter="true" data-x={options.socket}>
      <StockRect
        x={options.socket}
        y={102}
        width={250}
        height={32}
        rx={options.corner}
        fill={options.tokens.color.elevated}
        stroke={options.accent}
      />
      <LiteralDataText
        value={options.input.selectedCategory}
        x={options.socket + 16}
        y={124}
      />
    </g>
  );
}
