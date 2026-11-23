import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { service: Input["services"][number]; input: Input; x: number };
/** Displays the service label above its door. */
export function ServiceEntranceLabel({
  service,
  input,
  x,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={service.label}
        x={x}
        y={118}
        width={input.services.length === 3 ? 204 : 280}
        fontSize={14}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
