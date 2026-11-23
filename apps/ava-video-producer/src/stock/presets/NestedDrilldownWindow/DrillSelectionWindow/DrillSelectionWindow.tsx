import { DrillSecondSelection } from "../DrillSecondSelection/DrillSecondSelection";
import { DrillTiming } from "../DrillTiming";
import { DrillParentSelectionFrame } from "./DrillParentSelectionFrame";
import { useDrillSelectionWindowPresentation } from "./useDrillSelectionWindowPresentation";
import type { Input } from "../NestedDrilldownWindow.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

/**
 * A parent window opens first. A second supplied group narrows independently.
 */
export function DrillSelectionWindow(props: Readonly<Props>): ReactNode {
  const presentation = useDrillSelectionWindowPresentation(props);

  return (
    <g>
      {props.frame >= DrillTiming.PARENT_CUE ? (
        <DrillParentSelectionFrame {...presentation} />
      ) : undefined}
      {presentation.hasChild && props.frame >= DrillTiming.CHILD_CUE ? (
        <DrillSecondSelection
          input={props.input}
          progress={presentation.child}
          groups={presentation.subgroups}
          accent={props.accent}
        />
      ) : undefined}
    </g>
  );
}
