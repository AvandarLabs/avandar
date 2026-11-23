import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SedimentExportRibbon } from "./SedimentExportRibbon/SedimentExportRibbon";
import { SlopeExit } from "./SlopeExit";
import { SlopeGround } from "./SlopeGround";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
};
/**
 * A persistent sediment ribbon separates behind the strip and past the exit.
 */
export function SedimentFlow({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
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
        x={Motion.mix({ t: travel, from: 140, to: 510 - retainedWidth })}
        y={Motion.mix({ t: travel, from: 195, to: 310 })}
        width={retainedWidth}
        height={Motion.mix({ t: settle, from: 8, to: 24 })}
        fill={tokens.color.highlight}
      />
      <SedimentExportRibbon
        {...{ frame, tokens, bypass, outflow, settle, exportedWidth }}
      />
      <SlopeExit input={input} />
    </g>
  );
}
