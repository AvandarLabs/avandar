import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CodeWindow } from "../CodeWindow";
import { TerminalHeading } from "./TerminalHeading";
import { TerminalPrompt } from "./TerminalPrompt";
import { TerminalResponse } from "./TerminalResponse";
import { TerminalStep } from "./TerminalStep";
import { TYPING_AT, STEPS_AT, STEP_INTERVAL } from "./TerminalType.constants";
import type { Props } from "./TerminalType.types";
import type { ReactNode } from "react";

/** Renders the authored terminal study for StockGraphic at a given frame. */
export function TerminalType(props: Readonly<Props>): ReactNode {
  const { input, frame, accent } = props;
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { corner } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const drawing = {
    input,
    frame,
    accent,
    shapes,
    motion,
    command: Motion.typed({
      frame,
      at: TYPING_AT,
      text: input.command,
      cps: motion.typing.rate,
    }),
    terminalX: 130,
    atomic,
    corner,
  };
  return (
    <g>
      <TerminalHeading />
      <CodeWindow title={input.title}>
        <TerminalPrompt {...drawing} />
        {input.steps.map((step, stepIndex) => {
          return (
            <TerminalStep
              key={STEPS_AT + stepIndex * STEP_INTERVAL}
              {...{
                frame,
                accent,
                step: { ...step, at: STEPS_AT + stepIndex * STEP_INTERVAL },
                stepIndex,
              }}
            />
          );
        })}
        <TerminalResponse {...drawing} />
      </CodeWindow>
    </g>
  );
}
