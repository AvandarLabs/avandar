import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";

type Props = {
  resource: Input["existingResources"][number];
  x: number;
  y: number;
  index: number;
  accent: string;
  showLabel: boolean;
  isExisting?: boolean;
  isSeated?: boolean;
};
/** Stable resource badge and optional full name within its physical tab. */
export function ResourceTab({
  resource,
  x,
  y,
  index,
  accent,
  showLabel,
  isExisting = false,
  isSeated = false,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-existing-resource={isExisting ? resource.id : undefined}
      data-request-resource={isExisting ? undefined : resource.id}
      data-request-state={
        isExisting ? undefined : isSeated ? "seated" : "pending"
      }
    >
      <rect
        data-resource-tab={resource.id}
        x={x}
        y={y}
        width={78}
        height={132}
        rx={6}
        fill={STOCK.surface}
        stroke={accent}
        strokeDasharray={!isExisting && !isSeated ? "4 3" : undefined}
      />
      <LabelSlots labels={[[String(index + 1), x + 10, y + 18, 58, 14, 1]]} />
      {showLabel ? (
        <LabelSlots labels={[[resource.label, x + 5, y + 36, 68, 12, 6]]} />
      ) : null}
    </g>
  );
}
