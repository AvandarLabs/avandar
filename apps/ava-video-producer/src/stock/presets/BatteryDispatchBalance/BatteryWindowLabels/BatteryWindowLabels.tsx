import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

type Props = {
  labels: Array<
    | {
        text: Input["windows"]["chargeLabel"];
        x: number;
        y: number;
        width: number;
      }
    | {
        text: Input["windows"]["dispatchLabel"];
        x: number;
        y: number;
        width: number;
      }
    | {
        text: Input["windows"]["sourceLabel"];
        x: number;
        y: number;
        width: number;
      }
    | {
        text: Input["windows"]["loadLabel"];
        x: number;
        y: number;
        width: number;
      }
    | { text: Input["copy"]["capacity"]; x: number; y: number; width: number }
    | { text: string; x: number; y: number; width: number }
    | { text: Input["copy"]["unit"]; x: number; y: number; width: number }
    | { text: Input["copy"]["disclaimer"]; x: number; y: number; width: number }
  >;
};

/** Renders the text label with authored geometry. */
export function BatteryWindowLabels({ labels }: Readonly<Props>): ReactNode {
  return (
    <>
      {labels.map(({ text, x, y, width }) => {
        return (
          <FitText
            key={`${x}:${y}`}
            {...{ text, x, y, width }}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
    </>
  );
}
