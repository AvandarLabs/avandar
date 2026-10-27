import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";
type Props = { household: Input["households"][number]; index: number };
/** Household Caption for the authored scene. */
export function HouseholdCaption({
  household,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <g data-household-caption={household.id}>
      <FitText
        text={String(index + 1)}
        x={610}
        y={178 + index * 28}
        width={24}
        fontSize={12}
        maxLines={1}
        normalizeWhitespace
      />
      <FitText
        text={household.label}
        x={645}
        y={178 + index * 28}
        width={280}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
