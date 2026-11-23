import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  max: number;
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the string label with authored geometry. */
export function RehearsalRulerMaximum({
  max,
  y,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={String(max)}
      x={650}
      y={y + 24}
      width={128}
      fontSize={12}
      maxLines={2}
      anchor="end"
      breakLongWords
      normalizeWhitespace
      color={tokens.color.textMuted}
    />
  );
}
