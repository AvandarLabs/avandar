import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CustodyLegendEntry } from "./CustodyLegendEntry";
import { CustodyLegendLedger } from "./CustodyLegendLedger/CustodyLegendLedger";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 30)}>
      {[0, 1, 2].flatMap((column) => {
        return Array.from({ length: column === 1 ? 2 : 3 }, (_, row) => {
          return (
            <CustodyLegendEntry
              key={`${column}-${row}`}
              {...{ input, frame, accent, column, row }}
            />
          );
        });
      })}
      <CustodyLegendLedger {...{ input, motion, frame, tokens }} />
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
