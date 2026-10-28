import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { TrackLabels } from "./TrackLabels";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * A single released ball stops at the supplied observation after all flags
 * land.
 */
export function ExperimentTrack({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const descent = ramp(frame, 76, 10, EASE.inOut);
  const roll = ramp(frame, 86, 22, EASE.inOut);
  const observedX =
    450 + (430 * input.observationDistance) / input.track.maximum;
  const ballX = frame < 86 ? mix(descent, 405, 450) : mix(roll, 450, observedX);
  return (
    <g>
      <rect
        x={390}
        y={130}
        width={540}
        height={390}
        rx={15}
        fill={STOCK.surface}
        fillOpacity={0.3}
        stroke={STOCK.line}
      />
      <path
        d="M400 480 L450 500 H880 M450 495 V507 M880 495 V507"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={2}
      />
      <circle
        data-ball-distance={roll * input.observationDistance}
        cx={ballX}
        cy={mix(descent, 470, 490)}
        r={7}
        fill={STOCK.orange}
      />
      {frame >= 108 ? (
        <path
          data-observation-distance={input.observationDistance}
          d={`M${observedX} 472 l6 6 l-6 6 l-6 -6 Z`}
          fill={accent}
          stroke={accent}
        />
      ) : undefined}
      <TrackLabels input={input} />{" "}
    </g>
  );
}
