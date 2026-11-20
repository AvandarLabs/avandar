import { Text } from "../../graphics-common/Text";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for BatteryEquation. */
type Props = { input: Input };
/**
 * The complete energy equation remains visible even when loss ribbons are
 * hidden.
 */
export function BatteryEquation({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { battery, cycle, copy } = input;
  const final =
    battery.initialStoredKwh +
    cycle.chargeInputKwh -
    cycle.chargeLossKwh -
    cycle.deliveredKwh -
    cycle.dischargeLossKwh;
  const terms = [
    { label: copy.stored, value: battery.initialStoredKwh, operator: "+" },
    { label: copy.input, value: cycle.chargeInputKwh, operator: "=" },
    { label: copy.stored, value: final, operator: "+" },
    { label: copy.delivered, value: cycle.deliveredKwh, operator: "+" },
    { label: copy.chargeLoss, value: cycle.chargeLossKwh, operator: "+" },
    { label: copy.dischargeLoss, value: cycle.dischargeLossKwh, operator: "" },
  ];
  return (
    <g data-energy-equation="true">
      {terms.map(({ label, value, operator }, index) => {
        return (
          <g key={index}>
            <FitText
              text={label}
              x={32 + index * 152}
              y={455}
              width={124}
              fontSize={12}
              maxLines={4}
              breakLongWords
              normalizeWhitespace
            />
            <FitText
              text={String(value)}
              x={32 + index * 152}
              y={530}
              width={124}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
            <Text
              x={164 + index * 152}
              y={539}
              role="secondary"
              fill={tokens.color.textMuted}
            >
              {operator}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
