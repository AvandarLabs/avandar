import { loopPhase, wave } from "../../motion";
import { Eyebrow, STOCK, Text, type GraphicProps } from "../graphics-common";

const ORBITS = [
  { rx: 294, ry: 122, angle: -24, color: "accent", phase: 0 },
  { rx: 294, ry: 122, angle: 24, color: STOCK.cyan, phase: 58 },
  { rx: 185, ry: 185, angle: 0, color: STOCK.orange, phase: 112 },
] as const;

export function OrbitalSystem({
  frame,
  accent,
  background = STOCK.ground,
}: GraphicProps) {
  return (
    <g>
      <Eyebrow>ORBITAL SYSTEM</Eyebrow>
      {ORBITS.map((orbit, i) => {
        const color = orbit.color === "accent" ? accent : orbit.color;
        const angle = loopPhase(frame, 180, orbit.phase) * Math.PI * 2;
        const rotation = (orbit.angle * Math.PI) / 180;
        const x = orbit.rx * Math.cos(angle);
        const y = orbit.ry * Math.sin(angle);
        const px = 480 + x * Math.cos(rotation) - y * Math.sin(rotation);
        const py = 298 + x * Math.sin(rotation) + y * Math.cos(rotation);
        return (
          <g key={i}>
            <ellipse
              cx={480}
              cy={298}
              rx={orbit.rx}
              ry={orbit.ry}
              fill="none"
              stroke={color}
              strokeOpacity={0.24}
              strokeWidth={1.5}
              transform={`rotate(${orbit.angle} 480 298)`}
            />
            <circle
              cx={px}
              cy={py}
              r={17}
              fill={background}
              stroke={color}
              strokeOpacity={0.24}
            />
            <circle cx={px} cy={py} r={7} fill={color} />
            <text
              x={px}
              y={py - 27}
              textAnchor="middle"
              fill={color}
              fontSize={12}
              fontFamily="Arial, sans-serif"
            >
              {["ALPHA", "BETA", "GAMMA"][i]}
            </text>
          </g>
        );
      })}
      <circle
        cx={480}
        cy={298}
        r={71 + wave(frame, 90) * 5}
        fill={accent}
        fillOpacity={0.025}
        stroke={accent}
        strokeOpacity={0.1}
      />
      <circle
        cx={480}
        cy={298}
        r={49}
        fill={STOCK.surface}
        stroke={accent}
        strokeOpacity={0.7}
      />
      <path
        d="M480 272 L503 285 L503 311 L480 324 L457 311 L457 285 Z M480 272 V298 L503 311 M480 298 L457 311"
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <Text x={480} y={551} size={18} anchor="middle" fill={STOCK.muted}>
        Independent motion. Shared gravity.
      </Text>
    </g>
  );
}
