import { loopPhase, wave } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import {
  Caption,
  Eyebrow,
  Glyph,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import { useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { OrbitalSystemInput } from "../presets/OrbitalSystem/OrbitalSystem.schema";

type Props = GraphicProps & { input: OrbitalSystemInput };

const CENTER = { x: 480, y: 298 };
const LOOP_FRAMES = 180;
const CUBE_GLYPH =
  "M480 272 L503 285 L503 311 L480 324 L457 311 L457 285 Z M480 272 V298 L503 311 M480 298 L457 311";

function OrbitingBody({
  orbit,
  frame,
  color,
  showOrbit,
}: {
  orbit: OrbitalSystemInput["bodies"][number];
  frame: number;
  color: string;
  showOrbit: boolean;
}) {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  const angle = loopPhase(frame, LOOP_FRAMES, orbit.phase) * Math.PI * 2;
  const rotation = (orbit.angle * Math.PI) / 180;
  const x = orbit.rx * Math.cos(angle);
  const y = orbit.ry * Math.sin(angle);
  const px = CENTER.x + x * Math.cos(rotation) - y * Math.sin(rotation);
  const py = CENTER.y + x * Math.sin(rotation) + y * Math.cos(rotation);
  return (
    <g>
      {showOrbit ? (
        <ellipse
          cx={CENTER.x}
          cy={CENTER.y}
          rx={orbit.rx}
          ry={orbit.ry}
          fill="none"
          stroke={color}
          strokeOpacity={style.orbitAlpha}
          strokeWidth={style.orbitWidth}
          transform={`rotate(${orbit.angle} ${CENTER.x} ${CENTER.y})`}
        />
      ) : null}
      <circle
        cx={px}
        cy={py}
        r={style.bodyRadius}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.bodyAlpha}
        strokeWidth={style.bodyStrokeWidth}
      />
      <circle cx={px} cy={py} r={style.bodyCoreRadius} fill={color} />
      <Text
        role="data"
        x={px}
        y={py - style.bodyLabelOffset}
        fill={color}
        anchor="middle"
      >
        {orbit.label}
      </Text>
    </g>
  );
}

/** Draws the bounded authored orbital-system study at an explicit frame. */
export function OrbitalSystem({ input, frame, accent }: Readonly<Props>) {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["orbital-system"].orbitalSystem,
        })}
      </Eyebrow>
      {input.bodies.map((orbit, i) => (
        <OrbitingBody
          key={i}
          orbit={orbit}
          frame={frame}
          color={resolveContentColor(orbit.color, { tokens, accent })}
          showOrbit={input.showOrbits}
        />
      ))}
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
