import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { SchoolLocker } from "./SchoolLocker";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  doorWidth: number;
  accent: string;
  finalStep: number;
};
/**
 * Locker opens onto a dark interior while the classroom remains a practice
 * stop.
 */
export function PracticeInterior({
  input,
  doorWidth,
  accent,
  finalStep,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d="M48 410 H912 M48 410 V200 M912 410 V200"
        fill="none"
        stroke={STOCK.line}
      />
      <SchoolLocker input={input} doorWidth={doorWidth} accent={accent} />{" "}
      <path
        data-classroom={input.stops[1].id}
        d="M710 410 V235 H830 V410 M718 410 V243 H822 V410"
        stroke={accent}
        fill="none"
      />
      {input.showFootprints ? (
        <g opacity={0.25 * finalStep} fill={accent}>
          {Array.from({ length: 7 }, (_, index) => (
            <ellipse
              key={index}
              cx={410 + index * 45}
              cy={420 + (index % 2) * 7}
              rx={7}
              ry={3}
            />
          ))}
        </g>
      ) : undefined}
      <LabelSlots
        labels={[
          [input.stops[0].label, 290, 190, 290, 14, 3],
          [input.stops[1].label, 650, 190, 260, 14, 3],
        ]}
      />
    </g>
  );
}
