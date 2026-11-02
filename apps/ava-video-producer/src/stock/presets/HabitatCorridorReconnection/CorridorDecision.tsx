import { mix, ramp, EASE } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for CorridorDecision. */
type Props = { frame: number; input: Input };

/**
 * A management cue opens the authored footprint without changing its supplied
 * stage.
 */
export function CorridorDecision({ frame, input }: Readonly<Props>): ReactNode {
  const reach = ramp(frame, 28, 8, EASE.inOut),
    handX = mix(reach, 449, 480);
  return (
    <g>
      <FitText
        text={input.decision.actorLabel}
        x={32}
        y={90}
        width={360}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={550}
        y={90}
        width={378}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <PersonGlyph
        x={439}
        y={101}
        size={32}
        role="worker"
        color={STOCK.orange}
      />
      <rect
        data-plan-control="true"
        x={472}
        y={95}
        width={16}
        height={16}
        fill={STOCK.surface}
        stroke={STOCK.orange}
      />
      <path
        d={`M 445 101 L ${handX} 103`}
        stroke={STOCK.orange}
        strokeWidth={2.5}
        fill="none"
      />
      <circle
        data-plan-hand="true"
        cx={handX}
        cy={103}
        r={3}
        fill={STOCK.orange}
      />
    </g>
  );
}
