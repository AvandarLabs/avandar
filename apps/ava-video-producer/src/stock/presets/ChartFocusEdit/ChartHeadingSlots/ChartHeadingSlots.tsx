import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode, ComponentProps } from "react";

type Props = {
  slots: HeadingSlot[];
};

/** Renders the slots layer with authored geometry. */
export function ChartHeadingSlots({ slots }: Readonly<Props>): ReactNode {
  return (
    <>
      {slots.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity}>
            <FitText
              {...label}
              x={64}
              width={832}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </>
  );
}
type HeadingSlot = Omit<ComponentProps<typeof FitText>, "x" | "width"> & {
  opacity: number;
};
