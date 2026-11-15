import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Reference area and optional radius ratios use the same square-root scale. */
export function AreaLegend({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const ratio = input.sites[1].value / input.sites[0].value,
    radius = Math.sqrt(input.areaPerUnit / Math.PI);
  return (
    <g data-area-legend="true" data-area-per-unit={input.areaPerUnit}>
      <circle cx={546} cy={466} r={radius} fill="none" stroke={accent} />
      <LabelSlots
        labels={[
          [
            `1 ${input.unitLabel} = ${input.areaPerUnit} px²`,
            586,
            454,
            326,
            12,
            3,
          ],
        ]}
      />
      {input.showRadiusComparison ? (
        <g opacity={ramp(frame, 111, 28)}>
          <path
            data-reference-radius="true"
            d={`M546 466 h${radius}`}
            stroke={accent}
          />
          <LabelSlots
            labels={[
              [
                `A₂/A₁ = ${ratio} · r₂/r₁ = ${Math.sqrt(ratio)}`,
                516,
                526,
                396,
                12,
                3,
              ],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
