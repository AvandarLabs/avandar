import { propEq } from "@avandar/utils";
import { EntitySpineAssemblyLabels } from "./EntitySpineAssemblyLabels/EntitySpineAssemblyLabels";
import { EntitySpineAssemblyObservationsLayer } from "./EntitySpineAssemblyObservationsLayer/EntitySpineAssemblyObservationsLayer";
import { EntitySpineRow } from "./EntitySpineRow";
import { SpineContributions } from "./SpineContributions";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const observations = [...input.observations].sort((first, second) => {
    return (
      input.entities.findIndex(propEq("id", first.entityId)) -
      input.entities.findIndex(propEq("id", second.entityId))
    );
  });
  return (
    <g>
      <EntitySpineAssemblyLabels input={input} frame={frame} />
      <EntitySpineAssemblyObservationsLayer
        {...{ input, observations, frame, accent }}
      />
      {input.entities.map((entity, index) => {
        return (
          <EntitySpineRow
            key={entity.id}
            {...{ input, entity, index, frame, accent }}
          />
        );
      })}
      <SpineContributions {...{ input, observations, frame, accent }} />
    </g>
  );
}
