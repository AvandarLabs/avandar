import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { opening: number };
/**
 * The cover is always fully opaque, so it hides the paper beneath it. Its
 * opacity is stated rather than left to the default.
 */
const OPAQUE = 1;
/**
 * The opaque cover shares the brief's coordinate system and sits above its
 * complete paper.
 */
export function EnvelopeCover({ opening }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <rect
      data-opaque-cover={opening === 0 ? "closed" : "peeling"}
      x={0}
      y={266 * opening}
      width={536}
      height={266 * (1 - opening)}
      fill={tokens.color.elevated}
      fillOpacity={OPAQUE}
      opacity={OPAQUE}
    />
  );
}
