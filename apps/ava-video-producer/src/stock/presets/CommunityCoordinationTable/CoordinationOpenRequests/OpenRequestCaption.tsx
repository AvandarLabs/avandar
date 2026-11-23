import { FitText } from "../../../primitives/FitText/FitText";
import { OpenPlaceKey } from "./OpenPlaceKey";
import type { ReactNode } from "react";

type Props = {
  placeId: string;
  index: number;
  x: number;
  label: string;
  accent: string;
};
/** One open place's lettered key beside the unassigned caption. */
export function OpenRequestCaption({
  placeId,
  index,
  x,
  label,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-unassigned-caption={placeId}>
      <OpenPlaceKey index={index} x={x} accent={accent} />
      <FitText
        text={label}
        x={x + 20}
        y={86}
        width={405}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
