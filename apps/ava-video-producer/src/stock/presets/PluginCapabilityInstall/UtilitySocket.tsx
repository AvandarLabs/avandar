import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { UtilityModule } from "./UtilityModule";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** A single utility approaches and enters only the authored install socket. */
export function UtilitySocket({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const installation =
    input.installation.choice === "install"
      ? ramp(frame, 56, 34, EASE.inOut)
      : 0;
  const y = mix(installation, 78, 197);
  const status =
    installation === 1
      ? input.copy.installed
      : input.installation.choice === "defer" && frame >= 56
        ? input.copy.deferred
        : input.copy.emptySocket;
  return (
    <g>
      <rect
        data-tool-socket=""
        data-socket-occupied={installation === 1}
        x={500}
        y={192}
        width={395}
        height={110}
        rx={12}
        fill="none"
        stroke={STOCK.line}
        strokeDasharray="6 6"
      />
      {frame >= 12 ? (
        <g
          opacity={ramp(frame, 12, 30)}
          data-installed-utility={installation === 1 ? "single" : undefined}
        >
          <UtilityModule {...{ input, y, accent }} />
        </g>
      ) : null}
      <LabelSlots labels={[[status, 500, 317, 395, 12, 3]]} />
    </g>
  );
}
