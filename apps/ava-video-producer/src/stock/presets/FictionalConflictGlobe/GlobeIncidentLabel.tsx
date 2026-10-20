import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./FictionalConflictGlobe.schema";
import type { ReactNode } from "react";
type Props = {
  incident: Input["incidents"][number];
  index: number;
  labelY: number;
  visible: boolean;
  accent: string;
};
/** Fixed callouts retain separate identities even at coincident coordinates. */
export function GlobeIncidentLabel({
  incident,
  index,
  labelY,
  visible,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-incident-label={incident.id} opacity={visible ? 1 : 0.45}>
      <FitText
        text={String(index + 1)}
        x={616}
        y={labelY}
        width={25}
        fontSize={12}
        maxLines={1}
        color={accent}
        normalizeWhitespace
      />
      <FitText
        text={incident.label}
        x={650}
        y={labelY}
        width={260}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
