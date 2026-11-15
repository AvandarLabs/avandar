import { mix, ramp, EASE } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for DispatchOperator. */
type Props = { frame: number; accent: string; input: Input };

/**
 * The operator reaches and presses the dispatch cue before stored energy exits.
 */
export function DispatchOperator({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const reach = ramp(frame, 68, 8, EASE.inOut);
  const handX = mix(reach, 449, 480);
  const handY = mix(reach, 111, 105);
  return (
    <g>
      <FitText
        text={input.decision.actorLabel}
        x={32}
        y={95}
        width={360}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={550}
        y={95}
        width={378}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <PersonGlyph x={439} y={106} size={32} role="worker" color={STOCK.cyan} />
      <circle
        data-dispatch-button="true"
        cx={480}
        cy={105}
        r={9}
        fill={accent}
        fillOpacity={0.2 + 0.6 * reach}
      />
      <path
        d={`M 445 106 L ${handX} ${handY}`}
        stroke={STOCK.cyan}
        strokeWidth={2.5}
        fill="none"
      />
      <circle
        data-dispatch-hand="true"
        cx={handX}
        cy={handY}
        r={3}
        fill={STOCK.cyan}
      />
    </g>
  );
}
