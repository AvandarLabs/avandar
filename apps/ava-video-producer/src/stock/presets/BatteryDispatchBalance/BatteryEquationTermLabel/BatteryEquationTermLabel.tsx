import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

type Props = {
  label: Array<
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
  >[number]["label"];
  index: number;
};

/** Renders the label label with authored geometry. */
export function BatteryEquationTermLabel({
  label,
  index,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
