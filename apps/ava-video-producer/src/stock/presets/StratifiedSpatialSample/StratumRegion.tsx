import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { StratumBoundary } from "./StratumBoundary";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  stratum: Input["strata"][number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * Boundary and keyed label identify the selected fraction of an eligible frame.
 */
export function StratumRegion({
  input,
  stratum,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const eligible = input.sites.filter(propEq("stratumId", stratum.id));
  const selected = eligible.filter((site) =>
    input.selectedSiteIds.includes(site.id),
  );
  const color = [accent, STOCK.cyan, STOCK.orange, STOCK.mint][index];
  return (
    <g
      data-stratum={stratum.id}
      data-selected={selected.length}
      data-eligible={eligible.length}
    >
      <StratumBoundary
        stratum={stratum}
        index={index}
        frame={frame}
        color={color}
      />
      <text x={40 + index * 230} y={88} fill={color} fontSize={12}>
        {index + 1}
      </text>
      <LabelSlots
        labels={[
          [stratum.label, 60 + index * 230, 88, 195, 12, 3],
          [
            `${selected.length} / ${eligible.length}`,
            60 + index * 230,
            145,
            180,
            20,
            1,
          ],
        ]}
      />
    </g>
  );
}
