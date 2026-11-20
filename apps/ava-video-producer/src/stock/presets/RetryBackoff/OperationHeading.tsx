import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The operation's name over the faint timeline its attempts sit on. */
export function OperationHeading({
  label,
  accent,
}: Readonly<{ label: string; accent: string }>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <>
      <FitText
        text={label}
        x={40}
        y={72}
        width={880}
        maxLines={2}
        fontSize={24}
        normalizeWhitespace
        breakLongWords
      />
      <SketchedShape
        shape={{ kind: "path", d: "M80 310 H880" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeOpacity={atomic.opacity["24"]}
      />
    </>
  );
}
