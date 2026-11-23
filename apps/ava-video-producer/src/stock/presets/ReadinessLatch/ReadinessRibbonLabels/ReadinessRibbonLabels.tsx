import { FitText } from "../../../primitives/FitText/FitText";
import { useReadinessRibbonLabelsPresentation } from "./useReadinessRibbonLabelsPresentation";
import type { Input } from "../ReadinessLatch.schema.ts";
import type { ReactNode } from "react";

type Props = {
  participant: Input["participants"][number];
  input: Input;
  state: string;
  horizontal: boolean;
  x: number;
  y: number;
};
const TEXT: {
  fontSize: 12;
  breakLongWords: boolean;
  normalizeWhitespace: boolean;
} = { fontSize: 12 as const, breakLongWords: true, normalizeWhitespace: true };
/** Each branch has separate stable slots for its name, state and quantity. */
export function ReadinessRibbonLabels(props: Readonly<Props>): ReactNode {
  const presentation = useReadinessRibbonLabelsPresentation(props);

  return (
    <g>
      <FitText {...TEXT} {...presentation.label} />
      {props.input.showParticipantStates ? (
        <FitText {...TEXT} {...presentation.status} />
      ) : undefined}
      {props.input.showWorkValues ? (
        <g>
          <text {...presentation.value}>{props.participant.workUnits}</text>
          <FitText {...TEXT} {...presentation.unit} />
        </g>
      ) : undefined}
    </g>
  );
}
