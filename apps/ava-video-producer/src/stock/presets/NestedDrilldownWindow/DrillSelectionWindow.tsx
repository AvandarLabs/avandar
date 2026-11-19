import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DrillSecondSelection } from "./DrillSecondSelection";
import {
  CHILD_CUE,
  getChildFromFrame,
  getParentFromFrame,
  INSET_STROKE,
  PARENT_CUE,
} from "./drillTiming";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const parentGroups = [
    ...new Set(
      input.records.map((record) => {
        return record.groups[0];
      }),
    ),
  ];
  const subgroups = [
    ...new Set(
      input.records
        .filter((record) => {
          return record.groups[0] === input.selectionPath[0];
        })
        .map((record) => {
          return record.groups[1];
        }),
    ),
  ];
  const parent = getParentFromFrame(frame, motion);
  const child = getChildFromFrame(frame, motion);
  const parentX = 44 + parentGroups.indexOf(input.selectionPath[0]) * 292;
  const hasChild = input.selectionPath.length === 2;
  return (
    <g>
      {frame >= PARENT_CUE ? (
        <StockRect
          data-first-selection={input.selectionPath[0]}
          x={mix(parent, parentX, 36)}
          y={mix(parent, 174, 294)}
          width={mix(parent, 284, 888)}
          height={mix(parent, 390, 266)}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(
            input.selectionStyle === "inset-frame"
              ? INSET_STROKE
              : tokens.stroke.default,
          )}
          opacity={hasChild ? 1 - child : 1}
        />
      ) : undefined}
      {hasChild && frame >= CHILD_CUE ? (
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
