import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { EntitySpineRow } from "./EntitySpineRow";
import { SpineContributions } from "./SpineContributions";
import { SpineObservation } from "./SpineObservation";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** A unique key spine fixes record grain before repeated values are summed. */
export function EntitySpineAssembly({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const observations = [...input.observations].sort(
    (first, second) =>
      input.entities.findIndex(({ id }) => id === first.entityId) -
      input.entities.findIndex(({ id }) => id === second.entityId),
  );
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 50, 580, 850, 14, 1],
          [
            frame >= 140 ? input.copy.after : input.copy.before,
            50,
            30,
            850,
            14,
            1,
          ],
          [input.field.label, 460, 62, 440, 16, 2],
          [input.field.unit, 460, 102, 440, 12, 1],
        ]}
      />
      {input.showSourceRows
        ? observations.map((observation, index) => (
            <SpineObservation
              key={observation.id}
              input={input}
              observation={observation}
              index={index}
              frame={frame}
              accent={accent}
            />
          ))
        : null}
      {input.entities.map((entity, index) => (
        <EntitySpineRow
          key={entity.id}
          input={input}
          entity={entity}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <SpineContributions
        input={input}
        observations={observations}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
