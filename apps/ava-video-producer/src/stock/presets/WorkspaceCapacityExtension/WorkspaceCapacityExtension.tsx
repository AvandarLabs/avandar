import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { CapacityTray } from "./CapacityTray";
import { PendingResources } from "./PendingResources";
import { ResourceTab } from "./ResourceTab";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";
/** Authored resource collections, allowances and explicit choice. */
export type Props = GraphicProps & { input: Input };
/** Expand the same workspace only after an authored capacity choice. */
export function WorkspaceCapacityExtension({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const isExpanded = input.choice.decision === "expand" && frame >= 125;
  const allowance = isExpanded
    ? input.allowances.expandedAllowance
    : input.allowances.currentAllowance;
  return (
    <g data-selected-limit={allowance.limit}>
      <LabelSlots
        labels={[
          [input.copy.workspace, 60, 45, 840, 18, 2],
          [input.copy.capacity, 60, 95, 430, 12, 3],
          [`${allowance.label}: ${allowance.limit}`, 520, 95, 380, 12, 3],
          [input.copy.retained, 80, 191, 800, 14, 1],
          [input.copy.example, 60, 577, 840, 14, 1],
        ]}
      />
      <g opacity={ramp(frame, 51, 29)}>
        <LabelSlots labels={[[input.choice.label, 60, 158, 840, 16, 1]]} />
      </g>
      <CapacityTray input={input} frame={frame} accent={accent} />
      {input.existingResources.map((resource, index) => (
        <ResourceTab
          key={resource.id}
          resource={resource}
          x={90 + index * 86}
          y={240}
          index={index}
          accent={accent}
          showLabel={input.showResourceLabels}
          isExisting
        />
      ))}
      <PendingResources input={input} frame={frame} accent={accent} />
    </g>
  );
}
