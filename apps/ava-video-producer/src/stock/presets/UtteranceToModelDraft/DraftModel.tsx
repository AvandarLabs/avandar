import { DraftRelation } from "./DraftRelation";
import { DraftSlip } from "./DraftSlip";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/**
 * Two entity sockets and one authored direction, with an optional attribute.
 */
export function DraftModel({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = { frame, input, accent };
  return (
    <g>
      <DraftRelation frame={frame} input={input} accent={accent} />
      {input.draft.entities.map((entity, index) => (
        <DraftSlip
          key={entity.id}
          item={entity}
          index={index}
          {...scene}
          x={input.modelLayout === "horizontal" ? 60 + index * 610 : 60}
          y={input.modelLayout === "horizontal" ? 285 : 275 + index * 120}
          role={input.copy.entity}
        />
      ))}
      {input.draft.relationships.map((relation) => (
        <DraftSlip
          key={relation.id}
          item={relation}
          index={2}
          {...scene}
          x={input.modelLayout === "horizontal" ? 365 : 470}
          y={input.modelLayout === "horizontal" ? 315 : 300}
          role={input.copy.relationship}
        />
      ))}
      {input.draft.attributes.map((attribute) => (
        <DraftSlip
          key={attribute.id}
          item={attribute}
          index={3}
          {...scene}
          x={
            input.modelLayout === "horizontal"
              ? attribute.entityId === input.draft.entities[0].id
                ? 60
                : 670
              : 690
          }
          y={404}
          role={input.copy.attribute}
        />
      ))}
    </g>
  );
}
