import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  terms: Array<
    | { label: Input["copy"]["habitat"]; value: string }
    | { label: Input["copy"]["otherLand"]; value: string }
    | { label: Input["copy"]["areaUnit"]; value: string }
  >;
};

/** Renders the label label with authored geometry. */
export function HabitatLandBalanceTerms({ terms }: Readonly<Props>): ReactNode {
  return (
    <>
      {terms.map(({ label, value }, index) => {
        return (
          <g key={index}>
            <FitText
              text={label}
              x={32 + index * 310}
              y={512}
              width={276}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
            <FitText
              text={value}
              x={32 + index * 310}
              y={555}
              width={276}
              fontSize={12}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </>
  );
}
