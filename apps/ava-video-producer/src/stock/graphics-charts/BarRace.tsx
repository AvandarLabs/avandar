import { DUR, EASE, mix, ramp } from "../../motion";
import { Eyebrow, Pill, STOCK, Text, type GraphicProps } from "../graphics-common";

const BAR_DATA = [
  { label: "Alpha", start: 42, end: 86, from: 2, to: 0, color: STOCK.mint },
  { label: "Beta", start: 68, end: 72, from: 0, to: 1, color: STOCK.cyan },
  { label: "Gamma", start: 34, end: 58, from: 3, to: 2, color: STOCK.orange },
  { label: "Delta", start: 53, end: 41, from: 1, to: 3, color: STOCK.muted },
];

export function BarRace({ frame, accent }: GraphicProps) {
  const t = ramp(frame, 52, 64, EASE.inOut);
  const enter = ramp(frame, 12, DUR.hero);
  const labelOpacity =
    1 - ramp(frame, 52, DUR.chip) + ramp(frame, 116, DUR.panel);
  return (
    <g>
      <Eyebrow>RANKING IN MOTION</Eyebrow>
      <Pill x={748} y={44} width={148} text="FICTIONAL DATA" color={accent} />
      <Text x={64} y={112} size={29} weight={600}>
        Four series, one scale
      </Text>
      {[0, 25, 50, 75, 100].map((value) => (
        <g key={value}>
          <line
            x1={205 + value * 6}
            y1={157}
            x2={205 + value * 6}
            y2={474}
            stroke={STOCK.line}
            strokeOpacity={0.5}
          />
          <Text
            x={205 + value * 6}
            y={507}
            size={14}
            mono
            anchor="middle"
            fill={STOCK.muted}
          >
            {value}
          </Text>
        </g>
      ))}
      {BAR_DATA.map((bar, i) => {
        const value = mix(t, bar.start, bar.end) * enter;
        const y = 175 + mix(t, bar.from, bar.to) * 77;
        const color = i === 0 ? accent : bar.color;
        return (
          <g key={bar.label}>
            <g opacity={labelOpacity}>
              <Text x={177} y={y + 29} size={23} anchor="end">
                {bar.label}
              </Text>
            </g>
            <rect
              x={205}
              y={y}
              width={Math.max(0.01, value * 6)}
              height={43}
              rx={6}
              fill={color}
              fillOpacity={0.85}
            />
            <rect
              x={205}
              y={y}
              width={Math.max(0.01, value * 6)}
              height={43}
              rx={6}
              fill={color}
              fillOpacity={0.12}
              stroke={color}
            />
            <g opacity={labelOpacity}>
              <Text x={220 + value * 6} y={y + 29} size={21} mono fill={color}>
                {Math.round(value)}
              </Text>
            </g>
          </g>
        );
      })}
      {BAR_DATA.map((bar, i) => (
        <g key={bar.label}>
          <circle
            cx={72 + i * 216}
            cy={546}
            r={5}
            fill={i === 0 ? accent : bar.color}
          />
          <Text x={86 + i * 216} y={552} size={17} fill={STOCK.text}>
            {bar.label}
          </Text>
        </g>
      ))}
      <Text x={64} y={580} size={12} fill={STOCK.muted}>
        Illustrative values · fixed 0–100 scale
      </Text>
      <Text x={896} y={580} size={12} fill={STOCK.muted} anchor="end" mono>
        {Math.round(mix(t, 1, 2)) === 1 ? "PERIOD 01 → 02" : "PERIOD 02"}
      </Text>
    </g>
  );
}
