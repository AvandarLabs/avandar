import { DUR, ramp } from "../../motion";
import {
  Eyebrow,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const MATRIX_POINTS = Array.from({ length: 100 }, (_, i) => ({
  x: 78 + (i % 20) * 30,
  y: 222 + Math.floor(i / 20) * 48,
  selected: i < 64,
}));

export function DotMatrix({ frame, accent }: GraphicProps) {
  const selected = Math.round(
    MATRIX_POINTS.slice(0, 64).reduce(
      (total, _, i) => total + ramp(frame, 18 + i, DUR.chip),
      0,
    ),
  );
  return (
    <g>
      <Eyebrow>COHORT MATRIX</Eyebrow>
      <Pill x={748} y={44} width={148} text="FICTIONAL DATA" color={accent} />
      <Text x={64} y={118} size={31} weight={600}>
        One dot. One example.
      </Text>
      {MATRIX_POINTS.map((dot, i) => {
        const t = dot.selected ? ramp(frame, 18 + i, DUR.chip) : 0;
        return (
          <g key={i}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={8}
              fill={STOCK.muted}
              fillOpacity={0.3}
            />
            {dot.selected ? (
              <circle cx={dot.x} cy={dot.y} r={8} fill={accent} opacity={t} />
            ) : null}
          </g>
        );
      })}
      <path d="M705 181 V450" stroke={STOCK.line} />
      <Text x={744} y={288} size={79} weight={600} fill={accent}>
        {selected}
      </Text>
      <Text x={748} y={329} size={24}>
        of 100
      </Text>
      <Text x={748} y={362} size={15} fill={STOCK.muted}>
        Sample cohort
      </Text>
      <circle cx={78} cy={492} r={5} fill={accent} />
      <Text x={94} y={498} size={17} fill={STOCK.muted}>
        64 selected
      </Text>
      <circle cx={267} cy={492} r={5} fill={STOCK.muted} fillOpacity={0.4} />
      <Text x={283} y={498} size={17} fill={STOCK.muted}>
        36 remaining
      </Text>
      <Text x={64} y={553} size={13} fill={STOCK.muted} mono>
        ILLUSTRATIVE COHORT · 100 EXAMPLES
      </Text>
    </g>
  );
}
