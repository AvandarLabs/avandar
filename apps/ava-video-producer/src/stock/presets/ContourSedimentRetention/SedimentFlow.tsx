import { ramp, mix, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { SlopeExit } from "./SlopeExit";
import { SlopeGround } from "./SlopeGround";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * A persistent sediment ribbon separates behind the strip and past the exit.
 */
export function SedimentFlow({ input, frame }: Readonly<Props>): ReactNode {
  const { mobilizedKg, retainedKg } = input.sediment;
  const exported = mobilizedKg - retainedKg;
  const travel = ramp(frame, 60, 30, EASE.inOut);
  const bypass = ramp(frame, 60, 10, EASE.inOut);
  const outflow = ramp(frame, 70, 20, EASE.inOut);
  const settle = ramp(frame, 90, 18, EASE.inOut);
  const retainedWidth = (160 * retainedKg) / mobilizedKg;
  const exportedWidth = (130 * exported) / mobilizedKg;
  return (
    <g>
      <SlopeGround />
      <rect
        data-retained-ribbon="physical"
        x={mix(travel, 140, 510 - retainedWidth)}
        y={mix(travel, 195, 310)}
        width={retainedWidth}
        height={mix(settle, 8, 24)}
        fill={STOCK.orange}
      />
      <rect
        data-exported-ribbon="physical"
        x={frame < 70 ? mix(bypass, 300, 350) : mix(outflow, 350, 770)}
        y={frame < 70 ? mix(bypass, 238, 350) : mix(outflow, 350, 365)}
        width={exportedWidth}
        height={mix(settle, 8, 24)}
        fill={STOCK.orange}
      />
      <SlopeExit input={input} />
    </g>
  );
}
