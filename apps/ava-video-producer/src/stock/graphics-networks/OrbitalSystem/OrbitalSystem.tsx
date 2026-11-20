import { wave } from "../../../motion";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Caption } from "../../graphics-common/Caption";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Glyph } from "../../graphics-common/Glyph";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CENTER } from "./OrbitalSystem.constants";
import { OrbitingBody } from "./OrbitingBody/OrbitingBody";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { OrbitalSystemInput } from "../../presets/OrbitalSystem/OrbitalSystem.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: OrbitalSystemInput };

const CUBE_GLYPH =
  "M480 272 L503 285 L503 311 L480 324 L457 311 L457 285 Z M480 272 V298 L503 311 M480 298 L457 311";

function _buildKeyedBodies(bodies: OrbitalSystemInput["bodies"]) {
  const bodySignatureCounts = new Map<string, number>();
  return bodies.map((orbit) => {
    const signature = `${orbit.label}:${orbit.rx}:${orbit.ry}:${orbit.angle}:${orbit.phase}`;
    const occurrence = bodySignatureCounts.get(signature) ?? 0;
    bodySignatureCounts.set(signature, occurrence + 1);
    return { key: `${signature}#${occurrence}`, orbit };
  });
}

/** Draws the bounded authored orbital-system study at an explicit frame. */
export function OrbitalSystem({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["orbital-system"].orbitalSystem,
        })}
      </Eyebrow>
      {_buildKeyedBodies(input.bodies).map(({ key, orbit }) => {
        return (
          <OrbitingBody
            key={key}
            orbit={orbit}
            frame={frame}
            color={getContentColorFromValue(orbit.color, { tokens, accent })}
            showOrbit={input.showOrbits}
          />
        );
      })}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={
          style.pulseRadius + wave(frame, style.pulsePeriod) * style.pulseSwing
        }
        fill={accent}
        fillOpacity={style.pulseAlpha}
        stroke={accent}
        strokeOpacity={style.pulseStrokeAlpha}
        strokeWidth={style.pulseStrokeWidth}
      />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={style.coreRadius}
        fill={tokens.color.surface}
        stroke={accent}
        strokeOpacity={style.coreStrokeAlpha}
        strokeWidth={style.coreStrokeWidth}
      />
      <Glyph d={CUBE_GLYPH} color={accent} />
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["orbital-system"]
              .independentMotionSharedGravity,
        })}
      </Caption>
    </g>
  );
}
