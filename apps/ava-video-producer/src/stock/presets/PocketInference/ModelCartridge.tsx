import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CartridgeText } from "./CartridgeText";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The closed cartridge's corner, before the theme's corner style. */
const CARTRIDGE_CORNER = 16;
/**
 * The resident model seats entirely inside the casing before the single
 * inference ripple.
 */
export function ModelCartridge({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const y = mix(motion.ramp(frame, 20, motion.scale(16)), 106, 130);
  const ripple = motion.ramp(frame, 56, motion.scale(24));
  return (
    <g>
      <StockRect
        data-model-socket={input.showCutaway ? "cutaway" : "screen-inset"}
        x={194}
        y={122}
        width={572}
        height={88}
        rx={scales.corner(
          input.showCutaway ? tokens.corner.chip : CARTRIDGE_CORNER,
        )}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
        strokeDasharray={
          input.showCutaway ? atomic.dash.medium.join(" ") : undefined
        }
      />
      <g
        data-cartridge-installation="local"
        opacity={motion.ramp(frame, 20, motion.chip)}
      >
        <StockRect
          data-model-cartridge="resident"
          x={202}
          y={y}
          width={556}
          height={72}
          rx={scales.corner(6)}
          fill={tokens.color.elevated}
          stroke={accent}
        />
        <SketchedShape
          shape={{ kind: "path", d: `M214 ${y + 62} h532` }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeOpacity={tokens.alpha.dimmed}
        />
        <CartridgeText {...{ input, y }} />
        {frame >= 56 && frame < 80 ? (
          <rect
            data-inference-ripple="single"
            x={mix(ripple, 214, 738)}
            y={y + 8}
            width={6}
            height={48}
            fill={accent}
            fillOpacity={atomic.opacity["30"] * Math.sin(ripple * Math.PI)}
          />
        ) : undefined}
      </g>
    </g>
  );
}
