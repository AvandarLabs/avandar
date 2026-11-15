import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";

type Props = {
  tube: Input["parent"];
  x: number;
  volume: number;
  showIdentity: boolean;
};
/** Fixed tube-specific label bands preserve all authored labels and IDs. */
export function AliquotTubeLabels({
  tube,
  x,
  volume,
  showIdentity,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={volume.toFixed(1)}
        x={x}
        y={310}
        width={110}
        fontSize={20}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
      <FitText
        text={tube.label}
        x={x - 55}
        y={345}
        width={110}
        fontSize={14}
        maxLines={5}
        breakLongWords
        normalizeWhitespace
      />
      {showIdentity ? (
        <FitText
          text={tube.id}
          x={x - 55}
          y={435}
          width={110}
          fontSize={12}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
          color={STOCK.cyan}
        />
      ) : undefined}
    </g>
  );
}
