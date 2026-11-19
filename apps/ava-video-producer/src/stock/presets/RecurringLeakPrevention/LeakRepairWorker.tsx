import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The worker carries the catch tray and then physically handles the joint. */
export function LeakRepairWorker({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const containment = motion.ramp(
    frame,
    39,
    motion.scale(23),
    motion.travel.easing,
  );
  const repair = motion.ramp(frame, 63, motion.hero, motion.travel.easing);
  const trayX = mix(containment, 220, 480);
  const intervention = motion.ramp(
    frame,
    81,
    motion.scale(25),
    motion.travel.easing,
  );
  const repairX =
    input.repair.gesture === "replace-seal" ? mix(intervention, 439, 480) : 480;
  const handX = mix(repair, trayX, repairX);
  const handY = mix(repair, 430, 260);
  return (
    <g opacity={motion.reveal(frame, 14)}>
      <PersonGlyph x={175} y={370} size={80} role="worker" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: `M175 370 L${handX} ${handY}` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
        fill="none"
      />
      <circle
        data-repair-hand={frame >= 63 ? "true" : undefined}
        cx={handX}
        cy={handY}
        r={5}
        fill={accent}
      />
      <g opacity={motion.ramp(frame, 39, motion.whip)}>
        <StockRect
          data-catch-tray="true"
          x={trayX - 80}
          y={430}
          width={160}
          height={24}
          rx={scales.corner(5)}
          fill={tokens.color.surface}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <g opacity={motion.ramp(frame, 63, motion.whip)}>
        <SketchedShape
          shape={{ kind: "circle", cx: 480, cy: 260, r: 18 }}
          profile={tokens.sketch.shape}
          data-joint-repair="true"
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
        {input.repair.gesture === "tighten" ? (
          <g transform={`rotate(${mix(intervention, -35, 35)} 480 260)`}>
            <SketchedShape
              shape={{ kind: "path", d: "M480 260 l-22 30 l-8 -8" }}
              profile={tokens.sketch.shape}
              stroke={accent}
              strokeWidth={scales.stroke(5)}
              fill="none"
            />
          </g>
        ) : (
          <StockRect
            data-replacement-seal="true"
            x={mix(intervention, 430, 471)}
            y={238}
            width={18}
            height={44}
            rx={scales.corner(tokens.corner.chip)}
            stroke={accent}
            fill={tokens.color.surface}
            fillOpacity={tokens.alpha.ghost}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        )}
      </g>
    </g>
  );
}
