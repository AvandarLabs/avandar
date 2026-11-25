import { propEq, propNotEq, isDefined } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ObservationCaptionsCoverage } from "./ObservationCaptionsCoverage/ObservationCaptionsCoverage";
import { ObservationCaptionSlots } from "./ObservationCaptionSlots/ObservationCaptionSlots";
import { ObservationFieldCheckValues } from "./ObservationFieldCheckValues/ObservationFieldCheckValues";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

/** Inputs for ObservationCaptions. */
type Props = { input: Input };
/** Point labels and area totals explicitly retain their different supports. */
export function ObservationCaptions({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const observed =
    input.cells.filter(propNotEq("value", null)).length *
    input.metric.cellAreaHa;
  const missing =
    input.cells.filter(propEq("value", null)).length * input.metric.cellAreaHa;
  const labels = [
    { text: input.copy.disclaimer, x: 32, y: 252, width: 190, maxLines: 6 },
    {
      text: input.decision.actorLabel,
      x: 270,
      y: 426,
      width: 310,
      maxLines: 3,
    },
    {
      text: input.decision.actionLabel,
      x: 600,
      y: 426,
      width: 328,
      maxLines: 3,
    },
    input.fieldChecks.length
      ? { text: input.copy.fieldCheck, x: 32, y: 347, width: 190, maxLines: 4 }
      : undefined,
    input.fieldChecks.length
      ? {
          text: input.copy.pointSupport,
          x: 32,
          y: 409,
          width: 190,
          maxLines: 4,
        }
      : undefined,
  ].filter(isDefined);
  return (
    <g>
      <ObservationCaptionSlots labels={labels} />
      <ObservationFieldCheckValues input={input} tokens={tokens} />
      <ObservationCaptionsCoverage {...{ input, observed, missing }} />
    </g>
  );
}
