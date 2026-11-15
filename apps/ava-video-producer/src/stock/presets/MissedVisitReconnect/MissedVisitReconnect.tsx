import { EASE, mix, ramp } from "../../../motion";
import { type GraphicProps } from "../../graphics-common";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { ReconnectCase } from "./ReconnectCase";
import { ReconnectLedger } from "./ReconnectLedger";
import { ReconnectSetting } from "./ReconnectSetting";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** A worker contacts the fixed group; only attended people enter the clinic. */
export function MissedVisitReconnect({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const workerPosition = input.cases.reduce(
    (position, _, index) =>
      mix(
        ramp(frame, 39 + index * 9, 7, EASE.inOut),
        position,
        160 + index * 48,
      ),
    160,
  );
  return (
    <g>
      <ReconnectSetting input={input} />
      {input.cases.map((item, index) => (
        <ReconnectCase
          key={item.id}
          item={item}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <g data-worker="outreach" opacity={ramp(frame, 39, 8)}>
        <PersonGlyph
          x={350}
          y={workerPosition}
          size={32}
          role="worker"
          color={accent}
        />
      </g>
      <ReconnectLedger input={input} frame={frame} />
    </g>
  );
}
