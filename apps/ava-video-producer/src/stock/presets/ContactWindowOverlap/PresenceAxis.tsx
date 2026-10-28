import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** One fixed axis owns all record and investigation-window bounds. */
export function PresenceAxis({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel
        text={input.investigationWindow.label}
        x={350}
        y={125}
        width={530}
        lines={2}
      />
      <SceneLabel
        text={input.axis.unitLabel}
        x={32}
        y={160}
        width={240}
        lines={3}
      />
      <path d="M280 180 H910" stroke={STOCK.muted} />
      <text x={280} y={170} fill={STOCK.text} fontSize={12}>
        {input.axis.start}
      </text>
      <text x={910} y={170} fill={STOCK.text} fontSize={12} textAnchor="end">
        {input.axis.end}
      </text>
    </g>
  );
}
