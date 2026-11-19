import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const installation =
    input.installation.choice === "install"
      ? motion.ramp(frame, 56, motion.scale(34), motion.travel.easing)
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
      <StockRect
        data-tool-socket=""
        data-socket-occupied={installation === 1}
        x={500}
        y={192}
        width={395}
        height={110}
        rx={scales.corner(tokens.corner.card)}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.long.join(" ")}
      />
      {frame >= 12 ? (
        <g
          opacity={motion.ramp(frame, 12, motion.scale(30))}
          data-installed-utility={installation === 1 ? "single" : undefined}
        >
          <UtilityModule {...{ input, y, accent }} />
        </g>
      ) : null}
      <LabelSlots labels={[[status, 500, 317, 395, 12, 3]]} />
    </g>
  );
}
