import { STOCK } from "../../stockPalette";
import type { getServiceSceneFromFrame } from "./getServiceSceneFromFrame";
import type { Input } from "./ServiceablePanelSwap.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getServiceSceneFromFrame>;
};
/**
 * Stable enclosure and actual opening seam around the chosen fixed connector.
 */
export function ServiceEnclosure({ input, scene }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-enclosure={input.enclosure}
        x={160}
        y={205}
        width={input.modules.length * 170 - 10}
        height={174}
        rx={input.enclosure === "console" ? 18 : 2}
        fill={STOCK.elevated}
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <rect
        data-connector="true"
        x={scene.slotX + 68}
        y={218}
        width={6}
        height={30}
        fill={STOCK.cyan}
      />
      <path
        data-service-latch="true"
        d={`M${scene.slotX - 8} 365 V${223 - 38 * scene.latchOpen} H${scene.slotX + 144} V365`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      {input.showConnectorGuide ? (
        <path
          data-connector-guide="true"
          d={`M${scene.slotX + 71} 252 V400`}
          stroke={STOCK.cyan}
          strokeDasharray="3 5"
        />
      ) : undefined}
      <path
        data-retained-tray="true"
        d="M48 420 v138 h160 V420"
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={2}
      />
    </g>
  );
}
