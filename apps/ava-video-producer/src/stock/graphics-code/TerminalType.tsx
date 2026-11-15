import { caretOn, DUR, ramp, typed } from "../../motion";
import {
  Arrive,
  Check,
  Eyebrow,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { CodeWindow } from "./CodeWindow";
import type { TerminalTypeInput } from "../presets/TerminalType/TerminalType.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: TerminalTypeInput };

/** Draws the bounded authored terminal-type study at an explicit frame. */
export function TerminalType({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const terminalCommand = input.command;
  const steps = input.steps.map((step, index) => ({
    ...step,
    at: 61 + index * 22,
  }));
  const command = typed(frame, 17, terminalCommand, 28);
  const terminalX = 130;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["terminal-type"].terminalType,
        })}
      </Eyebrow>
      <CodeWindow title={input.title}>
        <Text x={101} y={211} size={22} mono fill={accent}>
          $
        </Text>
        <Text x={terminalX} y={211} size={22} mono>
          {command}
        </Text>
        {input.showCaret && caretOn(frame) && frame < 61 ? (
          <rect
            x={terminalX + command.length * 13.2 + 4}
            y={192}
            width={10}
            height={23}
            rx={1}
            fill={accent}
          />
        ) : null}
        {steps.map((step, i) => (
          <Arrive frame={frame} at={step.at} key={step.at}>
            <Check x={111} y={267 + i * 54} color={accent} size={14} />
            <Text x={139} y={274 + i * 54} size={21} mono>
              {step.text}
            </Text>
            <Text
              x={851}
              y={274 + i * 54}
              size={16}
              mono
              anchor="end"
              fill={STOCK.muted}
            >
              {step.detail}
            </Text>
          </Arrive>
        ))}
        <g opacity={ramp(frame, 126, DUR.sheet)}>
          <rect
            x={96}
            y={429}
            width={768}
            height={55}
            rx={8}
            fill={accent}
            fillOpacity={0.06}
          />
          <Text x={114} y={463} size={20} mono fill={accent}>
            {input.response}
          </Text>
        </g>
      </CodeWindow>
    </g>
  );
}
