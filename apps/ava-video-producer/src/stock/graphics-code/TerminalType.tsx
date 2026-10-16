import { caretOn, DUR, ramp, typed } from "../../motion";
import { Arrive, Check, Eyebrow, STOCK, Text, type GraphicProps } from "../graphics-common";
import { CodeWindow } from "./CodeWindow";

const TERMINAL_STEPS = [
  { at: 61, text: "Read sample records", detail: "01" },
  { at: 83, text: "Apply example rules", detail: "02" },
  { at: 105, text: "Prepare sample output", detail: "03" },
] as const;
const TERMINAL_COMMAND = "sample run --input records.csv";

export function TerminalType({ frame, accent }: GraphicProps) {
  const command = typed(frame, 17, TERMINAL_COMMAND, 28);
  const terminalX = 130;
  return (
    <g>
      <Eyebrow>TERMINAL TYPE</Eyebrow>
      <CodeWindow title="terminal · conceptual example">
        <Text x={101} y={211} size={22} mono fill={accent}>
          $
        </Text>
        <Text x={terminalX} y={211} size={22} mono>
          {command}
        </Text>
        {caretOn(frame) && frame < 61 ? (
          <rect
            x={terminalX + command.length * 13.2 + 4}
            y={192}
            width={10}
            height={23}
            rx={1}
            fill={accent}
          />
        ) : null}
        {TERMINAL_STEPS.map((step, i) => (
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
            Done. 3 example stages completed.
          </Text>
        </g>
      </CodeWindow>
    </g>
  );
}
