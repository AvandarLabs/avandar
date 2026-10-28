import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
type Props = {
  component: Input["plannedComponents"][number];
  index: number;
  showNames: boolean;
};
/** Compartment Label for the authored scene. */
export function CompartmentLabel({
  component,
  index,
  showNames,
}: Readonly<Props>): ReactNode {
  return showNames ? (
    <FitText
      text={component.label}
      x={-34}
      y={14}
      width={96}
      fontSize={12}
      maxLines={4}
      breakLongWords
      normalizeWhitespace
    />
  ) : (
    <FitText
      text={String(index + 1)}
      x={10}
      y={39}
      width={24}
      fontSize={14}
      maxLines={1}
      normalizeWhitespace
    />
  );
}
