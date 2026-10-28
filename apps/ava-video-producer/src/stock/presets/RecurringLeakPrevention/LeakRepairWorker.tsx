import { EASE, mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The worker carries the catch tray and then physically handles the joint. */
export function LeakRepairWorker({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const containment = ramp(frame, 39, 23, EASE.inOut);
  const repair = ramp(frame, 63, 18, EASE.inOut);
  const trayX = mix(containment, 220, 480);
  const intervention = ramp(frame, 81, 25, EASE.inOut);
  const repairX =
    input.repair.gesture === "replace-seal" ? mix(intervention, 439, 480) : 480;
  const handX = mix(repair, trayX, repairX);
  const handY = mix(repair, 430, 260);
  return (
    <g opacity={ramp(frame, 14, 12)}>
      <PersonGlyph x={175} y={370} size={80} role="worker" color={accent} />
      <path
        d={`M175 370 L${handX} ${handY}`}
        stroke={accent}
        strokeWidth={4}
        fill="none"
      />
      <circle
        data-repair-hand={frame >= 63 ? "true" : undefined}
        cx={handX}
        cy={handY}
        r={5}
        fill={accent}
      />
      <g opacity={ramp(frame, 39, 8)}>
        <rect
          data-catch-tray="true"
          x={trayX - 80}
          y={430}
          width={160}
          height={24}
          rx={5}
          fill={STOCK.surface}
          stroke={accent}
          strokeWidth={3}
        />
      </g>
      <g opacity={ramp(frame, 63, 8)}>
        <circle
          data-joint-repair="true"
          cx={480}
          cy={260}
          r={18}
          fill="none"
          stroke={accent}
          strokeWidth={4}
        />
        {input.repair.gesture === "tighten" ? (
          <path
            d="M480 260 l-22 30 l-8 -8"
            transform={`rotate(${mix(intervention, -35, 35)} 480 260)`}
            stroke={accent}
            strokeWidth={5}
            fill="none"
          />
        ) : (
          <rect
            data-replacement-seal="true"
            x={mix(intervention, 430, 471)}
            y={238}
            width={18}
            height={44}
            rx={4}
            stroke={accent}
            fill={STOCK.surface}
            fillOpacity={0.25}
            strokeWidth={3}
          />
        )}
      </g>
    </g>
  );
}
