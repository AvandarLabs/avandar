import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CartridgeText } from "./CartridgeText";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * The resident model seats entirely inside the casing before the single
 * inference ripple.
 */
export function ModelCartridge({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const y = mix(ramp(frame, 20, 16), 106, 130);
  const ripple = ramp(frame, 56, 24);
  return (
    <g>
      <rect
        data-model-socket={input.showCutaway ? "cutaway" : "screen-inset"}
        x={194}
        y={122}
        width={572}
        height={88}
        rx={input.showCutaway ? 4 : 16}
        fill={STOCK.ground}
        stroke={STOCK.line}
        strokeDasharray={input.showCutaway ? "4 5" : undefined}
      />
      <g data-cartridge-installation="local" opacity={ramp(frame, 20, 6)}>
        <rect
          data-model-cartridge="resident"
          x={202}
          y={y}
          width={556}
          height={72}
          rx={6}
          fill={STOCK.elevated}
          stroke={accent}
        />
        <path d={`M214 ${y + 62} h532`} stroke={accent} strokeOpacity={0.4} />
        <CartridgeText {...{ input, y }} />
        {frame >= 56 && frame < 80 ? (
          <rect
            data-inference-ripple="single"
            x={mix(ripple, 214, 738)}
            y={y + 8}
            width={6}
            height={48}
            fill={accent}
            fillOpacity={0.3 * Math.sin(ripple * Math.PI)}
          />
        ) : undefined}
      </g>
    </g>
  );
}
