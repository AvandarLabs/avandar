import { loopPhase } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../graphics-common/graphicCanvas.constants";
import { Particle } from "../graphics-common/Particle";
import { Rule } from "../graphics-common/Rule";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { PlexusFieldInput } from "../presets/PlexusField/PlexusField.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: PlexusFieldInput };

const LOOP_FRAMES = 180;
const HEADING_Y = 101;
const RULE_Y = 529;
const FOOTER_Y = 560;
const TWINKLE_PHASE_STEP = 9;

/** Draws the bounded authored plexus-field study at an explicit frame. */
export function PlexusField({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PlexusField", {});
  const { color, layout } = useGraphicTokens();
  const motion = useGraphicMotion();
  const margin = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - margin;
  const drift = motion.drift.distance;
  const points = Array.from({ length: input.particleCount }, (_, i) => {
    const angle =
      loopPhase(frame, LOOP_FRAMES, i * 11 + input.seed) * Math.PI * 2;
    return {
      x:
        76 +
        ((i * 173 + i * i * 11 + input.seed * 37) % 808) +
        Math.cos(angle) * (drift + (i % 9)),
      y:
        128 +
        ((i * 97 + i * i * 7 + input.seed * 53) % 350) +
        Math.sin(angle) * (drift + (i % 13)),
    };
  });
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].ambientConnections,
        })}
      </Eyebrow>
      <Text role="heading" x={margin} y={HEADING_Y}>
        {input.heading}
      </Text>
      {input.showConnections
        ? points.flatMap((a, i) => {
            return points.slice(i + 1).map((b, j) => {
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              return distance < style.linkDistance ? (
                <line
                  key={`${i}-${j}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={(i + j) % 4 === 0 ? color.accentAlt : accent}
                  opacity={
                    (1 - distance / style.linkDistance) * style.linkAlpha
                  }
                  strokeWidth={style.linkWidth}
                />
              ) : null;
            });
          })
        : null}
      {points.map((point, i) => {
        return (
          <Particle
            key={i}
            x={point.x}
            y={point.y}
            frame={frame}
            phase={i * TWINKLE_PHASE_STEP}
            color={i % 4 === 0 ? color.accentAlt : accent}
            haloColor={accent}
            isLarge={i % 7 === 0}
          />
        );
      })}
      <Rule x1={margin} x2={right} y={RULE_Y} />
      <Text role="footnote" x={margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].particleCount,
          values: { count: input.particleCount },
        })}
      </Text>
      <Text role="footnote" x={right} y={FOOTER_Y} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].deterministicField,
        })}
      </Text>
    </g>
  );
}
