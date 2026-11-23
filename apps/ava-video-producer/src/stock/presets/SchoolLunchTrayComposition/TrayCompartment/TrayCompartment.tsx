import { CompartmentLabel } from "../CompartmentLabel";
import { ServedFood } from "../ServedFood";
import { ServingUtensil } from "../ServingUtensil";
import { TrayCompartmentBody } from "./TrayCompartmentBody";
import { useTrayCompartmentPresentation } from "./useTrayCompartmentPresentation";
import type { Input } from "../SchoolLunchTrayComposition.schema.ts";
import type { ReactNode } from "react";

type Props = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  isServed: boolean;
  showNames: boolean;
  emphasize: boolean;
  accent: string;
};
/** Each compartment receives only its authored type from a moving spoon. */
export function TrayCompartment(props: Readonly<Props>): ReactNode {
  const presentation = useTrayCompartmentPresentation(props);

  return (
    <g
      transform={`translate(0 ${props.index * 72})`}
      data-compartment={props.component.id}
    >
      <TrayCompartmentBody {...presentation} />
      <CompartmentLabel
        component={props.component}
        index={props.index}
        showNames={props.showNames}
      />
      <ServedFood
        component={props.component}
        frame={props.frame}
        index={props.index}
        foodY={presentation.foodY}
        accent={props.accent}
        isServed={props.isServed}
      />
      <ServingUtensil
        component={props.component}
        frame={props.frame}
        index={props.index}
        foodY={presentation.foodY}
        isServed={props.isServed}
      />
    </g>
  );
}
