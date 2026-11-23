import { FitText } from "../../../primitives/FitText/FitText";
import type { CarbonStorageAccounting } from "../CarbonStorageAccounting";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof CarbonStorageAccounting>[0]["input"];
};

/** Renders the label label with authored geometry. */
export function CarbonBoundaryLabel({ input }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.boundary.label}
      x={50}
      y={46}
      width={860}
      fontSize={14}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  );
}
