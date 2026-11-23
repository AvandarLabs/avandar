import { GlobeProjection } from "../../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Reveals the globe context before the local clinic route. */
export function ClinicGlobeContext({
  input,
  frame,
  tokens,
  motion,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.view === "globe-to-local" ? (
        <g
          transform="translate(565 136)"
          opacity={
            1 - motion.ramp(frame, 36, motion.scale(24), motion.exit.easing)
          }
        >
          <SketchedShape
            shape={{ kind: "circle", cx: 0, cy: 0, r: 35 }}
            profile={tokens.sketch.shape}
            fill={tokens.color.surface}
            stroke={tokens.color.line}
          />
          <path
            d={GlobeProjection.getLandPathFromView({
              centerLongitude: 20,
              centerLatitude: 0,
              radius: 35,
            })}
            fill={tokens.color.inactive}
          />
        </g>
      ) : undefined}
    </>
  );
}
