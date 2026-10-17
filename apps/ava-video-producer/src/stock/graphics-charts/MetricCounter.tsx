import { DUR, ramp, mix } from "../../motion";
import {
  Arrive,
  Eyebrow,
  Panel,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const COUNTER_VALUES = [
  0.25, 0.4, 0.32, 0.53, 0.46, 0.6, 0.67, 0.61, 0.76, 0.87, 0.81, 1,
];

export function MetricCounter({ frame, accent }: GraphicProps) {
  const t = ramp(frame, 22, 66);
  const value = Math.round(mix(t, 0, 12480));
  return (
    <g>
      <Eyebrow>METRIC COUNTER</Eyebrow>
      <Pill x={748} y={44} width={148} text="FICTIONAL DATA" color={accent} />
      <Panel x={126} y={135} width={708} height={356}>
        <Text x={170} y={185} size={20} fill={STOCK.muted}>
          Example records processed
        </Text>
        <Text x={165} y={301} size={103} weight={600}>
          {value.toLocaleString("en-US")}
        </Text>
        <g opacity={ramp(frame, 82, DUR.sheet)}>
          <Pill
            x={170}
            y={326}
            width={173}
            text="SAMPLE TOTAL"
            color={accent}
          />
        </g>
        {COUNTER_VALUES.map((height, i) => (
          <Arrive frame={frame} at={29} index={i} key={i}>
            <rect
              x={172 + i * 50}
              y={437 - height * 54 * ramp(frame, 34 + i * 2, DUR.hero)}
              width={34}
              height={Math.max(
                1,
                height * 54 * ramp(frame, 34 + i * 2, DUR.hero),
              )}
              rx={4}
              fill={accent}
              fillOpacity={0.18 + i / 18}
            />
          </Arrive>
        ))}
      </Panel>
      <Text x={480} y={550} size={16} fill={STOCK.muted} anchor="middle">
        A measured arrival, followed by a reading hold.
      </Text>
    </g>
  );
}
