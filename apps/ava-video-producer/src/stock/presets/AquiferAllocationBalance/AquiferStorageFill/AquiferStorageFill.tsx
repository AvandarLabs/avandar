import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  height: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the aquifer fill with authored geometry. */
export function AquiferStorageFill({
  height,
  accent,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <rect
      data-aquifer-fill="true"
      x={300}
      y={380 - height}
      width={400}
      height={height}
      fill={accent}
      fillOpacity={tokens.alpha.guide}
    />
  );
}
