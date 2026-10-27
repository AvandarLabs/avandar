import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { DrillParentCompartment } from "./DrillParentCompartment";
import { DrillSelectionWindow } from "./DrillSelectionWindow";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Parent group frames recede into a labeled context strip as details open. */
export function DrillCompartments({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const groups = [...new Set(input.records.map((record) => record.groups[0]))];
  const progress = ramp(frame, 40, 34);
  return (
    <g>
      <FitText
        text={frame < 74 ? input.dimensions[0] : input.labels.context}
        x={44}
        y={154}
        width={872}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      {groups.map((group, index) => (
        <DrillParentCompartment
          key={group}
          group={group}
          index={index}
          isSelected={group === input.selectionPath[0]}
          retainContext={input.retainContext}
          progress={progress}
          accent={accent}
        />
      ))}
      {frame >= 40 ? (
        <g opacity={progress}>
          <FitText
            text={input.labels.detail}
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
      <DrillSelectionWindow frame={frame} input={input} accent={accent} />
    </g>
  );
}
