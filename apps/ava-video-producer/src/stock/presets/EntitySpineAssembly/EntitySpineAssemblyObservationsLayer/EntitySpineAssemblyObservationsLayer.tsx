import { SpineObservation } from "../SpineObservation/SpineObservation";
import type { EntitySpineAssembly } from "../EntitySpineAssembly";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof EntitySpineAssembly>[0]["input"];
  observations: ReturnType<
    Array<
      Parameters<typeof EntitySpineAssembly>[0]["input"]["observations"][number]
    >["sort"]
  >;
  frame: Parameters<typeof EntitySpineAssembly>[0]["frame"];
  accent: Parameters<typeof EntitySpineAssembly>[0]["accent"];
};

/** Renders the observations layer with authored geometry. */
export function EntitySpineAssemblyObservationsLayer({
  input,
  observations,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showSourceRows
        ? observations.map((observation, index) => {
            return (
              <SpineObservation
                key={observation.id}
                {...{ input, observation, index, frame, accent }}
              />
            );
          })
        : null}
    </>
  );
}
