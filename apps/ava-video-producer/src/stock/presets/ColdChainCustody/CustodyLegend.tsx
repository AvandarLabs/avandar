import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CustodyLegendEntry } from "./CustodyLegendEntry";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Monitoring, receipt and seal counts remain separately interpretable. */
export function CustodyLegend({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 30)}>
      {[0, 1, 2].flatMap((column) => {
        return Array.from({ length: column === 1 ? 2 : 3 }, (_, row) => {
          return (
            <CustodyLegendEntry
              key={`${column}-${row}`}
              input={input}
              frame={frame}
              accent={accent}
              column={column}
              row={row}
            />
          );
        });
      })}
      {input.showLedger ? (
        <g
          data-ledger="custody"
          opacity={motion.ramp(frame, 116, motion.scale(10))}
        >
          <SceneLabel
            text={input.copy.total}
            x={32}
            y={562}
            width={280}
            lines={3}
          />
          <text
            x={315}
            y={562}
            fill={tokens.color.text}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontSize={tokens.text.graphic.value.fontSize}
          >
            {input.crates.length}
          </text>
        </g>
      ) : undefined}
      <g
        data-physical-receipt={input.crates.length}
        opacity={motion.ramp(frame, 116, motion.scale(10))}
      >
        <SceneLabel
          text={input.copy.arrival}
          x={335}
          y={562}
          width={580}
          lines={2}
        />
      </g>
    </g>
  );
}
