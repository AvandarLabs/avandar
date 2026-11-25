import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  place: Input["places"][number];
  y: number;
};

/** Renders the label label with authored geometry. */
export function CoordinationPlaceName({
  place,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={place.label}
      x={40}
      y={y}
      width={280}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
