import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

/** The dash of an appointment slot left empty. */
const EMPTY_SLOT_DASH = "3 3";
type Props = { item: Input["cases"][number]; y: number };
/** The original person label, home and empty appointment remain visible. */
export function CaseHome({ item, y }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <SceneLabel text={item.label} x={32} y={y - 6} width={165} lines={3} />
      <ObjectGlyph
        kind="building"
        x={205}
        y={y}
        size={26}
        color={tokens.color.textMuted}
      />
      <StockRect
        data-empty-appointment={item.id}
        x={266}
        y={y - 12}
        width={18}
        height={22}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray={EMPTY_SLOT_DASH}
      />
    </g>
  );
}
