import { EASE, mix, ramp } from "../../../motion";
import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { STOCK } from "../../stockPalette";
import { CustodyCheckpoint } from "./CustodyCheckpoint";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = {
  crate: Input["crates"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
/** One persistent container and three independent checkpoint facts per stop. */
export function CustodyLane({
  crate,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const y = 165 + index * 50;
  const first = ramp(frame, 36 + index * 2, 30, EASE.inOut);
  const second = ramp(frame, 72 + index * 2, 35, EASE.inOut);
  const x = mix(first, 280, 510) + 230 * second;
  return (
    <g data-container={crate.id} opacity={ramp(frame, 12 + index * 2, 12)}>
      <path d={`M280 ${y} H740`} stroke={STOCK.line} strokeDasharray="4 6" />
      <SceneLabel text={crate.label} x={32} y={y - 5} width={190} lines={3} />
      {crate.checkpoints.map((checkpoint, stopIndex) => (
        <CustodyCheckpoint
          key={checkpoint.stopId}
          checkpoint={checkpoint}
          stopIndex={stopIndex}
          crateIndex={index}
          y={y}
          frame={frame}
          accent={accent}
          showMonitoring={input.showMonitoring}
        />
      ))}
      <g data-moving-container={crate.id} transform={`translate(${x} ${y})`}>
        <ObjectGlyph
          kind={crate.kind === "carrier" ? "resource" : "box"}
          x={0}
          y={0}
          size={26}
          color={accent}
        />
        {input.showIdentityRibbon ? (
          <SceneLabel text={crate.id} x={22} y={-5} width={185} lines={2} />
        ) : undefined}
      </g>
    </g>
  );
}
