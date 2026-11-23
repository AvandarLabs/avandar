import { Text } from "../../../graphics-common/Text";
import { FitText } from "../../../primitives/FitText/FitText";
import { BatteryEquationTermLabel } from "../BatteryEquationTermLabel/BatteryEquationTermLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

type Props = {
  terms: Array<
    | {
        label: Input["copy"]["stored"];
        value: Input["battery"]["initialStoredKwh"];
        operator: string;
      }
    | {
        label: Input["copy"]["input"];
        value: Input["cycle"]["chargeInputKwh"];
        operator: string;
      }
    | { label: Input["copy"]["stored"]; value: number; operator: string }
    | {
        label: Input["copy"]["delivered"];
        value: Input["cycle"]["deliveredKwh"];
        operator: string;
      }
    | {
        label: Input["copy"]["chargeLoss"];
        value: Input["cycle"]["chargeLossKwh"];
        operator: string;
      }
    | {
        label: Input["copy"]["dischargeLoss"];
        value: Input["cycle"]["dischargeLossKwh"];
        operator: string;
      }
  >;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the string label with authored geometry. */
export function BatteryEquationTerms({
  terms,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {terms.map(({ label, value, operator }, index) => {
        return (
          <g key={index}>
            <BatteryEquationTermLabel label={label} index={index} />
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
    </>
  );
}
