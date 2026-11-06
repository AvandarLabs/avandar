import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = { item: Input["cases"][number]; y: number };
/** The original person label, home and empty appointment remain visible. */
export function CaseHome({ item, y }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={item.label} x={32} y={y - 6} width={165} lines={3} />
      <ObjectGlyph
        kind="building"
        x={205}
        y={y}
        size={26}
        color={STOCK.muted}
      />
      <rect
        data-empty-appointment={item.id}
        x={266}
        y={y - 12}
        width={18}
        height={22}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="3 3"
      />
    </g>
  );
}
