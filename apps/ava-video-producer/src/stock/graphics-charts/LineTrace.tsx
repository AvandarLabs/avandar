import { EASE, mix, ramp } from "../../motion";
import { Eyebrow, Pill, STOCK, Text, type GraphicProps } from "../graphics-common";

const TRACE_VALUES = [18, 24, 21, 39, 35, 51, 47, 61, 58, 76, 73, 88];
const TRACE_REFERENCE = [12, 18, 23, 21, 30, 33, 41, 40, 43, 49, 51, 57];
const chartPoint = (value: number, i: number) => ({
  x: 121 + i * (718 / 11),
  y: 458 - value * 3.1,
});
const TRACE_PATH = TRACE_VALUES.map(
  (v, i) => `${i ? "L" : "M"}${chartPoint(v, i).x} ${chartPoint(v, i).y}`,
).join(" ");
const REFERENCE_PATH = TRACE_REFERENCE.map(
  (v, i) => `${i ? "L" : "M"}${chartPoint(v, i).x} ${chartPoint(v, i).y}`,
).join(" ");

export function LineTrace({ frame, accent, id }: GraphicProps) {
  const t = ramp(frame, 23, 94, EASE.inOut);
  const tracePosition = t * (TRACE_VALUES.length - 1);
  const index = Math.min(10, Math.floor(tracePosition));
  const between = tracePosition - index;
  const head = {
    x: mix(
      between,
      chartPoint(TRACE_VALUES[index], index).x,
      chartPoint(TRACE_VALUES[index + 1], index + 1).x,
    ),
    y: mix(
      between,
      chartPoint(TRACE_VALUES[index], index).y,
      chartPoint(TRACE_VALUES[index + 1], index + 1).y,
    ),
  };
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-chart-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.15" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-chart-clip`}>
          <rect
            x={119}
            y={143}
            width={Math.max(0, head.x - 119)}
            height={320}
          />
        </clipPath>
      </defs>
      <Eyebrow>LINE TRACE</Eyebrow>
      <Pill x={748} y={44} width={148} text="FICTIONAL DATA" color={accent} />
      <Text x={64} y={111} size={29} weight={600}>
        A trend takes shape
      </Text>
      {[0, 25, 50, 75, 100].map((value) => (
        <g key={value}>
          <path
            d={`M121 ${458 - value * 3.1} H839`}
            stroke={STOCK.line}
            strokeOpacity={0.6}
          />
          <Text
            x={99}
            y={463 - value * 3.1}
            size={13}
            fill={STOCK.muted}
            mono
            anchor="end"
          >
            {value}
          </Text>
        </g>
      ))}
      <path
        d={REFERENCE_PATH}
        fill="none"
        stroke={STOCK.cyan}
        strokeOpacity={0.38}
        strokeWidth={2}
        strokeDasharray="5 7"
      />
      <g clipPath={`url(#${id}-chart-clip)`}>
        <path
          d={`${TRACE_PATH} L839 458 H121 Z`}
          fill={`url(#${id}-chart-fill)`}
        />
        <path
          d={TRACE_PATH}
          fill="none"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {TRACE_VALUES.map((v, i) => (
          <circle
            key={i}
            cx={chartPoint(v, i).x}
            cy={chartPoint(v, i).y}
            r={3}
            fill={accent}
          />
        ))}
      </g>
      <path
        d={`M${head.x} ${head.y} V458`}
        stroke={accent}
        strokeOpacity={0.22}
        strokeDasharray="3 5"
      />
      <circle cx={head.x} cy={head.y} r={12} fill={accent} fillOpacity={0.1} />
      <circle cx={head.x} cy={head.y} r={5.5} fill={accent} />
      <Text x={121} y={491} size={14} mono fill={STOCK.muted}>
        01
      </Text>
      <Text x={839} y={491} size={14} mono fill={STOCK.muted} anchor="end">
        12
      </Text>
      <circle cx={121} cy={543} r={4} fill={accent} />
      <Text x={137} y={548} size={15} fill={STOCK.muted}>
        Series A
      </Text>
      <circle cx={260} cy={543} r={4} fill={STOCK.cyan} fillOpacity={0.5} />
      <Text x={276} y={548} size={15} fill={STOCK.muted}>
        Reference
      </Text>
      <Text x={896} y={548} size={13} fill={STOCK.muted} anchor="end">
        SAMPLE PERIODS
      </Text>
    </g>
  );
}
