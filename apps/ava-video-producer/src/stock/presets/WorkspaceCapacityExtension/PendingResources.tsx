import { EASE, mix, ramp } from "../../../motion";
import { PendingCaption } from "./PendingCaption";
import { ResourceTab } from "./ResourceTab";
import type { Input } from "./WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Every request stays pending until the whole authored expansion completes. */
export function PendingResources({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const seating =
    input.choice.decision === "expand" ? ramp(frame, 106, 19, EASE.inOut) : 0;
  const arrival = ramp(frame, 12, 38, EASE.inOut);
  const requestX = 90 + input.existingResources.length * 86;
  const requestY = mix(seating, mix(arrival, 433, 419), 240);
  return (
    <g opacity={arrival}>
      {seating < 1 ? (
        <PendingCaption
          label={input.copy.pending}
          {...{ requestX, requestY, accent }}
        />
      ) : null}
      {input.requestedResources.map((resource, index) => (
        <ResourceTab
          key={resource.id}
          resource={resource}
          index={input.existingResources.length + index}
          x={requestX + index * 86}
          y={requestY}
          accent={accent}
          showLabel={input.showResourceLabels}
          isSeated={seating === 1}
        />
      ))}
    </g>
  );
}
