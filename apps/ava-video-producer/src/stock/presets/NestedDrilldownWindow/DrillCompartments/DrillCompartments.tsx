import { FitText } from "../../../primitives/FitText/FitText";
import { DrillParentCompartment } from "../DrillParentCompartment";
import { DrillSelectionWindow } from "../DrillSelectionWindow/DrillSelectionWindow";
import { DrillTiming } from "../DrillTiming";
import { DrillContextHeading } from "./DrillContextHeading";
import { useDrillCompartmentsPresentation } from "./useDrillCompartmentsPresentation";
import type { Input } from "../NestedDrilldownWindow.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Parent group frames recede into a labeled context strip as details open. */
export function DrillCompartments(props: Readonly<Props>): ReactNode {
  const presentation = useDrillCompartmentsPresentation(props);

  return (
    <g>
      <DrillContextHeading {...presentation} />
      {presentation.groups.map((group, index) => {
        return (
          <DrillParentCompartment
            key={group}
            group={group}
            index={index}
            isSelected={group === props.input.selectionPath[0]}
            retainContext={props.input.retainContext}
            progress={presentation.progress}
            accent={props.accent}
          />
        );
      })}
      {props.frame >= DrillTiming.PARENT_CUE ? (
        <g opacity={presentation.progress}>
          <FitText
            text={props.input.labels.detail}
            x={44}
            y={270}
            width={420}
            fontSize={14}
            maxLines={2}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
      <DrillSelectionWindow
        frame={props.frame}
        input={props.input}
        accent={props.accent}
      />
    </g>
  );
}
