import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DrillParentCompartment } from "./DrillParentCompartment";
import { DrillSelectionWindow } from "./DrillSelectionWindow";
import { DrillTiming } from "./DrillTiming";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Parent group frames recede into a labeled context strip as details open. */
export function DrillCompartments({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const groups = [
    ...new Set(
      input.records.map((record) => {
        return record.groups[0];
      }),
    ),
  ];
  const progress = DrillTiming.getParentFromFrame({ frame, motion });
  return (
    <g>
      <FitText
        text={
          frame < DrillTiming.CHILD_CUE
            ? input.dimensions[0]
            : input.labels.context
        }
        x={44}
        y={154}
        width={872}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      {groups.map((group, index) => {
        return (
          <DrillParentCompartment
            key={group}
            group={group}
            index={index}
            isSelected={group === input.selectionPath[0]}
            retainContext={input.retainContext}
            progress={progress}
            accent={accent}
          />
        );
      })}
      {frame >= DrillTiming.PARENT_CUE ? (
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
