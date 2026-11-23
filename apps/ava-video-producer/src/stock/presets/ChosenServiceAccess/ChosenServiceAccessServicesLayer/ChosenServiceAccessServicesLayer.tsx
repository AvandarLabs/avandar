import { ServiceEntrance } from "../ServiceEntrance";
import type { ChosenServiceAccess } from "../ChosenServiceAccess";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof ChosenServiceAccess>[0]["input"];
  frame: Parameters<typeof ChosenServiceAccess>[0]["frame"];
  accent: Parameters<typeof ChosenServiceAccess>[0]["accent"];
};

/** Renders the services layer with authored geometry. */
export function ChosenServiceAccessServicesLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.services.map((service, index) => {
        return (
          <ServiceEntrance
            key={service.id}
            {...{ service, index, input, frame, accent }}
          />
        );
      })}
    </>
  );
}
