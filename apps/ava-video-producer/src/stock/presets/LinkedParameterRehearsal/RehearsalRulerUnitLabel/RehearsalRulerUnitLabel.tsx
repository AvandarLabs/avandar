import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  unit: string;
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the unit label with authored geometry. */
export function RehearsalRulerUnitLabel({
  unit,
  y,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={unit}
      x={716}
      y={y - 14}
      width={180}
      fontSize={12}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
      color={tokens.color.textMuted}
    />
  );
}
