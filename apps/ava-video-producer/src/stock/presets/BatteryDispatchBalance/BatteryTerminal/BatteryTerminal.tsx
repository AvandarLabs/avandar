import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the fill with authored geometry. */
export function BatteryTerminal({ x, y, tokens }: Readonly<Props>): ReactNode {
  return (
    <rect x={x + 58} y={y - 8} width={48} height={8} fill={tokens.color.line} />
  );
}
