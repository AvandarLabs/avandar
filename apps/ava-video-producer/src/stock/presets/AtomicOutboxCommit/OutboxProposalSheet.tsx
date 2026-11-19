import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { x: number; accent: string };
/** A dashed sheet half remains provisional before the shared commit. */
export function OutboxProposalSheet({ x, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const scales = useGraphicShapeScales();
  return (
    <StockRect
      x={x}
      y={390}
      width={320}
      height={84}
      rx={scales.corner(tokens.corner.chip)}
      stroke={accent}
      fill="none"
      strokeDasharray={atomic.dash.medium.join(" ")}
    />
  );
}
