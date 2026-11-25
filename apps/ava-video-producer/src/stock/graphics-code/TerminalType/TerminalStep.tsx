import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { Check } from "../../graphics-common/Check";
import { Text } from "../../graphics-common/Text";
import { STEP_DETAIL_SIZE } from "./TerminalType.constants";
import type { Props as TerminalProps } from "./TerminalType.types";
import type { ReactNode } from "react";

type Props = {
  frame: TerminalProps["frame"];
  accent: TerminalProps["accent"];
  step: TerminalProps["input"]["steps"][number] & { at: number };
  stepIndex: number;
};

/** Renders the terminal step layer for TerminalType. */
export function TerminalStep(props: Readonly<Props>): ReactNode {
  return (
    <Arrive frame={props.frame} at={props.step.at} key={props.step.at}>
      <Check
        x={111}
        y={267 + props.stepIndex * 54}
        color={props.accent}
        size={14}
      />
      <Text role="code" x={139} y={274 + props.stepIndex * 54}>
        {props.step.text}
      </Text>
      <Text
        role="lineNumber"
        x={851}
        y={274 + props.stepIndex * 54}
        size={STEP_DETAIL_SIZE}
        anchor="end"
      >
        {props.step.detail}
      </Text>
    </Arrive>
  );
}
