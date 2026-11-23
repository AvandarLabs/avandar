import { propEq } from "@avandar/utils";
import { SpineSum } from "../SpineSum";
import type { Input } from "../EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  observations: Input["observations"];
};

/** Renders the entities layer with authored geometry. */
export function SpineContributionsEntitiesLayer({
  frame,
  input,
  observations,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {frame >= 100
        ? input.entities.map((entity) => {
            const index = observations.findIndex(propEq("entityId", entity.id));
            return index >= 0 ? (
              <SpineSum
                key={entity.id}
                input={input}
                observation={observations[index]}
                index={index}
                frame={frame}
              />
            ) : null;
          })
        : null}
    </>
  );
}
