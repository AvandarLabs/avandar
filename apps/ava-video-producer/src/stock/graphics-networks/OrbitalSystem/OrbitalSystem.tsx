import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getKeyedBodiesFromOrbits } from "./getKeyedBodiesFromOrbits";
import { OrbitalCore } from "./OrbitalCore";
import { OrbitalPulse } from "./OrbitalPulse";
import { OrbitingBody } from "./OrbitingBody/OrbitingBody";
import type { Props } from "./OrbitalSystem.types";
import type { ReactNode } from "react";

/** Renders OrbitalSystem within the authored stock graphics. */
export function OrbitalSystem({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "OrbitalSystem",
    props: {},
  });
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["orbital-system"].orbitalSystem,
        })}
      </Eyebrow>
      {getKeyedBodiesFromOrbits(input.bodies).map(({ key, orbit }) => {
        return (
          <OrbitingBody
            key={key}
            orbit={orbit}
            frame={frame}
            color={getContentColorFromValue({
              value: orbit.color,
              options: { tokens, accent },
            })}
            showOrbit={input.showOrbits}
          />
        );
      })}
      <OrbitalPulse {...{ frame, accent, style, tokens, shapes }} />
      <OrbitalCore {...{ accent, style, tokens, shapes }} />
    </g>
  );
}
