import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { CategoryTallies } from "./CategoryTallies";
import { RetainedRecordStrip } from "./RetainedRecordStrip";
import { UtilitySocket } from "./UtilitySocket";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";
/** A complete authored utility-installation study. */
export type Props = GraphicProps & { input: Input };
/** Optional installation exposes one counting operation over unchanged rows. */
export function PluginCapabilityInstall({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.workspace, 55, 44, 840, 18, 2],
          [input.copy.records, 55, 92, 390, 12, 3],
          [input.utility.fieldLabel, 55, 136, 390, 12, 1],
          [input.copy.example, 55, 586, 840, 12, 1],
        ]}
      />
      <RetainedRecordStrip input={input} accent={accent} frame={frame} />
      <UtilitySocket input={input} frame={frame} accent={accent} />
      <g opacity={ramp(frame, 12, 43)}>
        <LabelSlots
          labels={[[input.installation.decisionLabel, 500, 369, 395, 12, 3]]}
        />
      </g>
      <CategoryTallies input={input} frame={frame} accent={accent} />
    </g>
  );
}
