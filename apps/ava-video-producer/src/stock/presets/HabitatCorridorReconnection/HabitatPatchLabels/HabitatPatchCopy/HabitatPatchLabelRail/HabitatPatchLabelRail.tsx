import { FitText } from "../../../../../primitives/FitText/FitText";
import type { Input } from "../../../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  patch: Input["patches"][number];
  index: number;
};
/** Displays each patch identity and area on reserved label rails. */
export function HabitatPatchLabelRail({
  patch,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={patch.label}
        x={32 + index * 684}
        y={200}
        width={212}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={String(patch.areaHa)}
        x={72 + index * 650}
        y={382}
        width={180}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
