import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StratumBoundary } from "../StratumBoundary/StratumBoundary";
import { StratumKey } from "./StratumKey";
import type { Input } from "../StratifiedSpatialSample.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { eligible, selected } = _getStratumSites({
    input,
    stratumId: stratum.id,
  });
  const color = [
    accent,
    tokens.color.accentAlt,
    tokens.color.highlight,
    tokens.color.positive,
  ][index];
  const fraction = `${selected.length} / ${eligible.length}`;
  const labelX = 60 + index * 230;
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
      <StratumKey index={index} color={color} />
      <LabelSlots
        labels={[
          [stratum.label, 60 + index * 230, 88, 195, 12, 3],
          [fraction, labelX, 145, 180, 20, 1],
        ]}
      />
    </g>
  );
}
/** The stratum's eligible sites, and those of them selected. */
function _getStratumSites({
  input,
  stratumId,
}: Readonly<{ input: Input; stratumId: string }>) {
  const eligible = input.sites.filter(propEq("stratumId", stratumId));
  return {
    eligible,
    selected: eligible.filter((site) => {
      return input.selectedSiteIds.includes(site.id);
    }),
  };
}
