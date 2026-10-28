import { mix, ramp } from "../../../motion";
import { DrillSecondSelection } from "./DrillSecondSelection";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * A parent window opens first. A second supplied group narrows independently.
 */
export function DrillSelectionWindow({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const parentGroups = [
    ...new Set(input.records.map((record) => record.groups[0])),
  ];
  const subgroups = [
    ...new Set(
      input.records
        .filter((record) => record.groups[0] === input.selectionPath[0])
        .map((record) => record.groups[1]),
    ),
  ];
  const parent = ramp(frame, 40, 34);
  const child = ramp(frame, 74, 44);
  const parentX = 44 + parentGroups.indexOf(input.selectionPath[0]) * 292;
  const hasChild = input.selectionPath.length === 2;
  return (
    <g>
      {frame >= 40 ? (
        <rect
          data-first-selection={input.selectionPath[0]}
          x={mix(parent, parentX, 36)}
          y={mix(parent, 174, 294)}
          width={mix(parent, 284, 888)}
          height={mix(parent, 390, 266)}
          fill="none"
          stroke={accent}
          strokeWidth={input.selectionStyle === "inset-frame" ? 5 : 2}
          opacity={hasChild ? 1 - child : 1}
        />
      ) : undefined}
      {hasChild && frame >= 74 ? (
        <DrillSecondSelection
          input={input}
          progress={child}
          groups={subgroups}
          accent={accent}
        />
      ) : undefined}
    </g>
  );
}
