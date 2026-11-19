import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { opening: number };
/**
 * The opaque cover shares the brief's coordinate system and sits above its
 * complete paper.
 */
export function EnvelopeCover({ opening }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <rect
      data-opaque-cover={opening === 0 ? "closed" : "peeling"}
      x={0}
      y={266 * opening}
      width={536}
      height={266 * (1 - opening)}
      fill={tokens.color.elevated}
      fillOpacity={1}
      opacity={1}
    />
  );
}
