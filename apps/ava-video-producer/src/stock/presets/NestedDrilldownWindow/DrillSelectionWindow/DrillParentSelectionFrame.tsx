import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { DrillTiming } from "../DrillTiming";
import type { useDrillSelectionWindowPresentation } from "./useDrillSelectionWindowPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDrillSelectionWindowPresentation>,
  | "input"
  | "accent"
  | "tokens"
  | "scales"
  | "parent"
  | "child"
  | "parentX"
  | "hasChild"
>;
/** Render the drill parent selection frame. */
export function DrillParentSelectionFrame(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-first-selection={props.input.selectionPath[0]}
      x={Motion.mix({ t: props.parent, from: props.parentX, to: 36 })}
      y={Motion.mix({ t: props.parent, from: 174, to: 294 })}
      width={Motion.mix({ t: props.parent, from: 284, to: 888 })}
      height={Motion.mix({ t: props.parent, from: 390, to: 266 })}
      fill="none"
      stroke={props.accent}
      strokeWidth={props.scales.stroke(
        props.input.selectionStyle === "inset-frame"
          ? DrillTiming.INSET_STROKE
          : props.tokens.stroke.default,
      )}
      opacity={props.hasChild ? 1 - props.child : 1}
    />
  );
}
