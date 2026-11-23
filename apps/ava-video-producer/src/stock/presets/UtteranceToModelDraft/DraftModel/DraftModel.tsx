import { DraftRelation } from "../DraftRelation/DraftRelation";
import { DraftSlip } from "../DraftSlip/DraftSlip";
import { DraftAttributeSlips } from "./DraftAttributeSlips";
import { DraftEntitySlip } from "./DraftEntitySlip";
import { getDraftModelLayout } from "./getDraftModelLayout";
import type { Input } from "../UtteranceToModelDraft.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Two entity sockets and one authored direction, with an optional attribute.
 */
export function DraftModel(props: Readonly<Props>): ReactNode {
  const presentation = getDraftModelLayout(props);

  return (
    <g>
      <DraftRelation
        frame={props.frame}
        input={props.input}
        accent={props.accent}
      />
      {props.input.draft.entities.map((entity, index) => {
        return (
          <DraftEntitySlip
            key={entity.id}
            {...presentation}
            entity={entity}
            index={index}
          />
        );
      })}
      {props.input.draft.relationships.map((relation) => {
        return (
          <DraftSlip
            key={relation.id}
            item={relation}
            index={2}
            {...presentation.scene}
            x={props.input.modelLayout === "horizontal" ? 365 : 470}
            y={props.input.modelLayout === "horizontal" ? 315 : 300}
            role={props.input.copy.relationship}
          />
        );
      })}
      <DraftAttributeSlips {...presentation} />
    </g>
  );
}
