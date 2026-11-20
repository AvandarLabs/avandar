import { typed } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../graphics-common/Arrive/Arrive";
import { Check } from "../graphics-common/Check";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CodeWindow } from "./CodeWindow";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { TerminalTypeInput } from "../presets/TerminalType/TerminalType.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: TerminalTypeInput };
const TYPING_AT = 17;
const STEPS_AT = 61;
const STEP_INTERVAL = 22;
const RESPONSE_AT = 126;
const PROMPT_SIZE = "4xl";
const STEP_DETAIL_SIZE = "md";
const RESPONSE_SIZE = "2xl";
const CARET_CORNER = 1;
/** Draws the bounded authored terminal-type study at an explicit frame. */
export function TerminalType({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { corner } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const terminalCommand = input.command;
  const steps = input.steps.map((step, index) => {
    return { ...step, at: STEPS_AT + index * STEP_INTERVAL };
  });
  const command = typed(frame, TYPING_AT, terminalCommand, motion.typing.rate);
  const terminalX = 130;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["terminal-type"].terminalType,
        })}
      </Eyebrow>
      <CodeWindow title={input.title}>
        <Text role="field" x={101} y={211} size={PROMPT_SIZE} fill={accent}>
          $
        </Text>
        <Text role="field" x={terminalX} y={211} size={PROMPT_SIZE}>
          {command}
        </Text>
        {input.showCaret && motion.caretOn(frame) && frame < STEPS_AT ? (
          <rect
            x={terminalX + command.length * 13.2 + 4}
            y={192}
            width={10}
            height={23}
            rx={shapes.corner(CARET_CORNER)}
            fill={accent}
          />
        ) : null}
        {steps.map((step, i) => {
          return (
            <Arrive frame={frame} at={step.at} key={step.at}>
              <Check x={111} y={267 + i * 54} color={accent} size={14} />
              <Text role="code" x={139} y={274 + i * 54}>
                {step.text}
              </Text>
              <Text
                role="lineNumber"
                x={851}
                y={274 + i * 54}
                size={STEP_DETAIL_SIZE}
                anchor="end"
              >
                {step.detail}
              </Text>
            </Arrive>
          );
        })}
        <g opacity={motion.ramp(frame, RESPONSE_AT, motion.sheet)}>
          <rect
            x={96}
            y={429}
            width={768}
            height={55}
            rx={shapes.corner(corner.cell)}
            fill={accent}
            fillOpacity={shapes.wash(atomic.opacity["6"])}
          />
          <Text role="field" x={114} y={463} size={RESPONSE_SIZE} fill={accent}>
            {input.response}
          </Text>
        </g>
      </CodeWindow>
    </g>
  );
}
