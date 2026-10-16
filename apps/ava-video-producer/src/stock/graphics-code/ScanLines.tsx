import { EASE, mix, ramp } from "../../motion";
import {
  Check,
  Eyebrow,
  Panel,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const SCAN_ROWS = [
  "record / alpha",
  "record / beta",
  "record / gamma",
  "record / delta",
  "record / epsilon",
  "record / zeta",
];

export function ScanLines({ frame, accent, id }: GraphicProps) {
  const t = ramp(frame, 23, 110, EASE.inOut);
  const scanY = mix(t, 138, 489);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-scan`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0" />
          <stop offset="1" stopColor={accent} stopOpacity="0.12" />
        </linearGradient>
        <clipPath id={`${id}-scan-clip`}>
          <rect x={153} y={142} width={691} height={344} rx={12} />
        </clipPath>
      </defs>
      <Eyebrow>SCANNING PASS</Eyebrow>
      <Pill x={744} y={44} width={152} text="SAMPLE RECORDS" color={accent} />
      <Panel x={153} y={142} width={691} height={344} radius={12} />
      {SCAN_ROWS.map((row, i) => {
        const y = 178 + i * 55;
        const passed = ramp(scanY, y - 12, 28);
        return (
          <g key={row}>
            <Text x={184} y={y + 9} size={18} mono fill={STOCK.text}>
              {row}
            </Text>
            <path
              d={`M423 ${y + 2} h${118 + (i % 3) * 23} M625 ${y + 2} h${53 + (i % 2) * 34}`}
              stroke={STOCK.muted}
              strokeOpacity={0.28}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <circle
              cx={795}
              cy={y + 2}
              r={11}
              fill={accent}
              fillOpacity={passed * 0.12}
              stroke={accent}
              strokeOpacity={0.15 + passed * 0.6}
            />
            <g opacity={passed}>
              <Check x={795} y={y + 2} color={accent} size={9} />
            </g>
            {i < 5 ? (
              <path
                d={`M176 ${y + 29} H821`}
                stroke={STOCK.line}
                strokeOpacity={0.6}
              />
            ) : null}
          </g>
        );
      })}
      <g clipPath={`url(#${id}-scan-clip)`}>
        <rect
          x={153}
          y={scanY - 67}
          width={691}
          height={67}
          fill={`url(#${id}-scan)`}
        />
        <path d={`M153 ${scanY} H844`} stroke={accent} strokeWidth={1.5} />
      </g>
      <path d="M115 142 V486" stroke={STOCK.line} strokeWidth={2} />
      <rect
        x={110}
        y={scanY - 12}
        width={10}
        height={24}
        rx={5}
        fill={accent}
      />
      <Text x={153} y={535} size={15} mono fill={STOCK.muted}>
        INSPECT
      </Text>
      <Text x={844} y={535} size={15} mono anchor="end" fill={STOCK.muted}>
        VERIFY
      </Text>
    </g>
  );
}
