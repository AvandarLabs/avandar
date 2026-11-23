import { PendingCaption } from "../PendingCaption";
import { ResourceTab } from "../ResourceTab";
import type { Input } from "../WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  seating: number;
  arrival: number;
  requestX: number;
  requestY: number;
};

/** Renders the pending request items in authored paint order. */
export function PendingRequestItems(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.arrival}>
      {options.seating < 1 ? (
        <PendingCaption
          label={options.input.copy.pending}
          {...{
            requestX: options.requestX,
            requestY: options.requestY,
            accent: options.accent,
          }}
        />
      ) : null}
      {options.input.requestedResources.map((resource, index) => {
        return (
          <ResourceTab
            key={resource.id}
            resource={resource}
            index={options.input.existingResources.length + index}
            x={options.requestX + index * 86}
            y={options.requestY}
            accent={options.accent}
            showLabel={options.input.showResourceLabels}
            isSeated={options.seating === 1}
          />
        );
      })}
    </g>
  );
}
