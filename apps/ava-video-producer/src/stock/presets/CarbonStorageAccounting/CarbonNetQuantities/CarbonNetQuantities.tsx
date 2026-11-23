import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = {
  retained: number;
  emissions: number;
};

/** Renders the string label with authored geometry. */
export function CarbonNetQuantities({
  retained,
  emissions,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {[retained, emissions, retained - emissions].map((value, index) => {
        return (
          // prettier-ignore
          // The three slots always mean retained mass, emissions
          // and their difference, in that order. Only their values
          // change.
          // react-doctor-disable-next-line no-array-index-as-key
          <FitText key={index}
            text={String(value)}
            x={540 + index * 135}
            y={510}
            width={110}
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
