import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { text: string };

/** Names the highlighted comparison reference for `UncertaintyReference`. */
export function ReferenceLabel({ text }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <FitText
      text={text}
      x={480}
      y={182}
      width={760}
      fontSize={16}
      maxLines={2}
      anchor="middle"
      breakLongWords
      normalizeWhitespace
      color={tokens.color.highlight}
    />
  );
}
