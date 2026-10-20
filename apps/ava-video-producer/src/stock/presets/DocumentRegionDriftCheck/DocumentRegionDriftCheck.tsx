import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ContentComparison } from "./ContentComparison";
import { RegionPage } from "./RegionPage";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";
/** Exact saved locator and authored current comparison content. */
export type Props = GraphicProps & { input: Input };
/** Reopens a fixed page region and latches mismatching content for review. */
export function DocumentRegionDriftCheck({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [input.copy.source, 52, 90, 400, 12, 3],
          [input.copy.result, 508, 90, 400, 12, 3],
          [input.labels.saved, 52, 140, 400, 14, 3],
          [input.labels.current, 508, 140, 400, 14, 3],
          [input.labels.geometry, 52, 560, 856, 14, 2],
        ]}
      />
      <RegionPage input={input} frame={frame} accent={accent} side="saved" />
      <RegionPage input={input} frame={frame} accent={accent} side="current" />
      <ContentComparison input={input} frame={frame} accent={accent} />
    </g>
  );
}
