import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  min: number;
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the string label min with authored geometry. */
export function RehearsalRulerMinimum({
  min,
  y,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={String(min)}
      x={380}
      y={y + 24}
      width={128}
      fontSize={12}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
      color={tokens.color.textMuted}
    />
  );
}
