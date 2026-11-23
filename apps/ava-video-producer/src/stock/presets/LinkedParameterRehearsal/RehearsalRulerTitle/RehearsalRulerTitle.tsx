import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = {
  label: string;
  y: number;
};

/** Renders the label label with authored geometry. */
export function RehearsalRulerTitle({ label, y }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={label}
      x={64}
      y={y - 14}
      width={270}
      fontSize={14}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
