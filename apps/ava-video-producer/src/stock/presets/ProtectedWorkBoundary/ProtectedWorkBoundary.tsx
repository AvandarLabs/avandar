import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BoundaryRequest } from "./BoundaryRequest/BoundaryRequest";
import { BoundaryWorker } from "./BoundaryWorker";
import { ProtectedBoundaryPattern } from "./ProtectedBoundaryPattern";
import { ProtectedSlot } from "./ProtectedSlot";
import { useProtectedWorkBoundaryPresentation } from "./useProtectedWorkBoundaryPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";
/** Frame-driven finite schedule and authored request disposition. */
export type Props = GraphicProps & { input: Input };
/** Preserves existing commitments while a worker moves the incoming request. */
export function ProtectedWorkBoundary(props: Readonly<Props>): ReactNode {
  const presentation = useProtectedWorkBoundaryPresentation(props);

  return (
    <g>
      <ProtectedBoundaryPattern {...presentation} />
      <LabelSlots
        labels={[
          [props.input.labels.unit, 45, 550, 400, 14, 3],
          [props.input.labels.example, 500, 550, 410, 14, 3],
          [props.input.labels.protected, 45, 195, 500, 12, 2],
        ]}
      />
      <BoundaryWorker
        frame={props.frame}
        input={props.input}
        accent={props.accent}
      />
      {props.input.slots.map((slot, index) => {
        return (
          <ProtectedSlot
            key={slot.id}
            slot={slot}
            index={index}
            frame={props.frame}
            input={props.input}
            accent={props.accent}
            id={props.id}
          />
        );
      })}
      <BoundaryRequest
        frame={props.frame}
        input={props.input}
        accent={props.accent}
      />
    </g>
  );
}
