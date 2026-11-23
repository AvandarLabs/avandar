import { Text } from "../../graphics-common/Text";
import { STEPS_AT, PROMPT_SIZE, CARET_CORNER } from "./TerminalType.constants";
import type { Motion } from "../../../motion";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as TerminalProps } from "./TerminalType.types";
import type { ReactNode } from "react";

type Props = {
  input: TerminalProps["input"];
  frame: TerminalProps["frame"];
  accent: TerminalProps["accent"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  command: ReturnType<typeof Motion.typed>;
  terminalX: number;
};

/** Renders the terminal prompt layer for TerminalType. */
export function TerminalPrompt(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="field" x={101} y={211} size={PROMPT_SIZE} fill={props.accent}>
        $
      </Text>
      <Text role="field" x={props.terminalX} y={211} size={PROMPT_SIZE}>
        {props.command}
      </Text>
      {props.input.showCaret &&
      props.motion.caretOn(props.frame) &&
      props.frame < STEPS_AT ? (
        <rect
          x={props.terminalX + props.command.length * 13.2 + 4}
          y={192}
          width={10}
          height={23}
          rx={props.shapes.corner(CARET_CORNER)}
          fill={props.accent}
        />
      ) : null}
    </>
  );
}
