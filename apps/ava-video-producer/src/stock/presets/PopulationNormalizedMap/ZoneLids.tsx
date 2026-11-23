import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ZoneLid } from "./ZoneLid/ZoneLid";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Count shades lift and settle as population-normalized shades on stable zones.
 */
export function ZoneLids({ input, frame, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const lift =
    32 *
    motion.ramp(frame, 36, motion.scale(36), motion.travel.easing) *
    (1 - motion.ramp(frame, 72, motion.scale(36), motion.travel.easing));
  return (
    <g>
      <rect
        x={40}
        y={155}
        width={530}
        height={305}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
      />
      {input.zones.map((zone, index) => {
        return (
          <ZoneLid
            key={zone.id}
            zone={zone}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
            lift={lift}
          />
        );
      })}
    </g>
  );
}
