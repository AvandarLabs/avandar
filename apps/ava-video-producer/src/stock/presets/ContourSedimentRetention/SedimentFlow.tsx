import { mix } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SlopeExit } from "./SlopeExit";
import { SlopeGround } from "./SlopeGround";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * A persistent sediment ribbon separates behind the strip and past the exit.
 */
export function SedimentFlow({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const { mobilizedKg, retainedKg } = input.sediment;
  const exported = mobilizedKg - retainedKg;
  const travel = motion.ramp(frame, 60, motion.scale(30), motion.travel.easing);
  const bypass = motion.ramp(frame, 60, motion.scale(10), motion.travel.easing);
  const outflow = motion.ramp(
    frame,
    70,
    motion.scale(20),
    motion.travel.easing,
  );
  const settle = motion.ramp(frame, 90, motion.hero, motion.travel.easing);
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
        fill={tokens.color.highlight}
      />
      <rect
        data-exported-ribbon="physical"
        x={frame < 70 ? mix(bypass, 300, 350) : mix(outflow, 350, 770)}
        y={frame < 70 ? mix(bypass, 238, 350) : mix(outflow, 350, 365)}
        width={exportedWidth}
        height={mix(settle, 8, 24)}
        fill={tokens.color.highlight}
      />
      <SlopeExit input={input} />
    </g>
  );
}
