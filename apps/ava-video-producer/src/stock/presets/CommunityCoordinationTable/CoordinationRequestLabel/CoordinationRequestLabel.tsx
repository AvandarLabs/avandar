import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { place: Input["places"][number]; index: number };
/** Displays the request copy below its place card. */
export function CoordinationRequestLabel({
  place,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={place.requestLabel}
        x={40}
        y={174 + 108 * index}
        width={280}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
