import { loopPhase, wave } from "../../motion";
import { Eyebrow, STOCK, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { PlexusFieldInput } from "../presets/PlexusField/PlexusField.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: PlexusFieldInput };

/** Draws the bounded authored plexus-field study at an explicit frame. */
export function PlexusField({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const particlePoints = Array.from(
    { length: input.particleCount },
    (_, i) => ({
      x: 76 + ((i * 173 + i * i * 11 + input.seed * 37) % 808),
      y: 128 + ((i * 97 + i * i * 7 + input.seed * 53) % 350),
      phase: i * 11 + input.seed,
    }),
  );
  const points = particlePoints.map((p, i) => ({
    x:
      p.x +
      Math.cos(loopPhase(frame, 180, p.phase) * Math.PI * 2) * (12 + (i % 9)),
    y:
      p.y +
      Math.sin(loopPhase(frame, 180, p.phase) * Math.PI * 2) * (12 + (i % 13)),
  }));
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].ambientConnections,
        })}
      </Eyebrow>
      <Text x={64} y={101} size={22} fill={STOCK.text}>
        {input.heading}
      </Text>
      {input.showConnections
        ? points.flatMap((a, i) =>
            points.slice(i + 1).map((b, j) => {
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              return distance < 148 ? (
                <line
                  key={`${i}-${j}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={(i + j) % 4 === 0 ? STOCK.cyan : accent}
                  opacity={(1 - distance / 148) * 0.62}
                  strokeWidth={1.1}
                />
              ) : null;
            }),
          )
        : null}
      {points.map((p, i) => (
        <g key={i} opacity={0.45 + wave(frame, 90, i * 9) * 0.55}>
          {i % 7 === 0 ? (
            <circle cx={p.x} cy={p.y} r={14} fill={accent} fillOpacity={0.06} />
          ) : null}
          <circle
            cx={p.x}
            cy={p.y}
            r={i % 7 === 0 ? 4.5 : 2.7}
            fill={i % 4 === 0 ? STOCK.cyan : accent}
          />
        </g>
      ))}
      <line x1={64} y1={529} x2={896} y2={529} stroke={STOCK.line} />
      <Text x={64} y={560} size={14} mono fill={STOCK.muted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].particleCount,
          values: { count: input.particleCount },
        })}
      </Text>
      <Text x={896} y={560} size={14} mono anchor="end" fill={STOCK.muted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].deterministicField,
        })}
      </Text>
    </g>
  );
}
