import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../GroupedValuePicker.schema";
import type { ReactNode } from "react";

const RESULT_CORNER = 6;
import type { GroupedValuePickerGetPickerResultCopyValue } from "../GroupedValuePicker";

type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  value: GroupedValuePickerGetPickerResultCopyValue["value"];
  attachment: GroupedValuePickerGetPickerResultCopyValue["attachment"];
  result: GroupedValuePickerGetPickerResultCopyValue["result"];
  unit: GroupedValuePickerGetPickerResultCopyValue["unit"];
};
/** Displays the exact aggregate, missing value, and unit. */
export function PickerDerivedResult({
  input,
  accent,
  tokens,
  scales,
  value,
  attachment,
  result,
  unit,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        data-exact-result={value === null ? "null" : value}
        data-result-unit={value === null ? "" : unit}
        opacity={attachment}
        transform={`translate(${Motion.mix({ t: attachment, from: 25, to: 0 })} 0)`}
      >
        <StockRect
          data-derived-result="true"
          x={645}
          y={340}
          width={267}
          height={195}
          rx={scales.corner(RESULT_CORNER)}
          fill={tokens.color.elevated}
          stroke={accent}
        />
        <LabelSlots
          labels={[
            [input.labels.result, 660, 365, 237, 14, 3],
            [result, 660, 422, 237, 20, 3],
          ]}
        />
        {value !== null ? (
          <LabelSlots labels={[[unit, 660, 495, 237, 14, 3]]} />
        ) : null}
      </g>
    </>
  );
}
