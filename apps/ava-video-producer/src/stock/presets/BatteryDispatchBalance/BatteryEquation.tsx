import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BatteryEquationTerms } from "./BatteryEquationTerms/BatteryEquationTerms";
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
      <BatteryEquationTerms terms={terms} tokens={tokens} />
    </g>
  );
}
