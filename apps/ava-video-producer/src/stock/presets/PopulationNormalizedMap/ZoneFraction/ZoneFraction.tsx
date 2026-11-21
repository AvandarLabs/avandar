import { FitText } from "../../../primitives/FitText/FitText";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { useZoneFractionPresentation } from "./useZoneFractionPresentation";
import { ZoneFractionValues } from "./ZoneFractionValues";
import type { Input } from "../PopulationNormalizedMap.schema.ts";
import type { ReactNode } from "react";

type Props = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** Every denominator stays present even when the numerator hold is disabled. */
export function ZoneFraction(props: Readonly<Props>): ReactNode {
  const presentation = useZoneFractionPresentation(props);

  return (
    <g data-fraction-zone={props.zone.id}>
      <LabelSlots
        labels={[[props.zone.label, 600, presentation.y, 340, 12, 1]]}
      />
      <ZoneFractionValues {...presentation} />
      <FitText
        text={String(props.frame < 72 ? props.zone.records : presentation.rate)}
        x={750}
        y={presentation.y + 42}
        width={185}
        fontSize={14}
        maxLines={2}
        color={props.accent}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  );
}
