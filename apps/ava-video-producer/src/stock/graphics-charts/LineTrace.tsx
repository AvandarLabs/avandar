import { EASE, mix, ramp } from "../../motion";
import {
  Eyebrow,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { LineTraceInput } from "../presets/LineTrace/LineTrace.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: LineTraceInput };

/** Draws the bounded authored line-trace study at an explicit frame. */
export function LineTrace({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const points = input.points;
  const chartPoint = (value: number, index: number) => ({
    x: 121 + index * (718 / (points.length - 1)),
    y: 458 - value * 3.1,
  });
  const tracePath = points
    .map(
      (value, index) =>
        `${index ? "L" : "M"}${chartPoint(value, index).x} ${chartPoint(value, index).y}`,
    )
    .join(" ");
  const referencePath = input.reference
    .map(
      (value, index) =>
        `${index ? "L" : "M"}${chartPoint(value, index).x} ${chartPoint(value, index).y}`,
    )
    .join(" ");
  const t = ramp(frame, 23, 94, EASE.inOut);
  const tracePosition = t * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(tracePosition));
  const between = tracePosition - index;
  const head = {
    x: mix(
      between,
      chartPoint(points[index], index).x,
      chartPoint(points[index + 1], index + 1).x,
    ),
    y: mix(
      between,
      chartPoint(points[index], index).y,
      chartPoint(points[index + 1], index + 1).y,
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
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].lineTrace,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].fictionalData,
        })}
        color={accent}
      />
      <Text x={64} y={111} size={29} weight={600}>
        {input.heading}
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
      {input.showReference ? (
        <path
          d={referencePath}
          fill="none"
          stroke={STOCK.cyan}
          strokeOpacity={0.38}
          strokeWidth={2}
          strokeDasharray="5 7"
        />
      ) : null}
      <g clipPath={`url(#${id}-chart-clip)`}>
        <path
          d={`${tracePath} L839 458 H121 Z`}
          fill={`url(#${id}-chart-fill)`}
        />
        <path
          d={tracePath}
          fill="none"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((v, i) => (
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
        {String(points.length).padStart(2, "0")}
      </Text>
      <circle cx={121} cy={543} r={4} fill={accent} />
      <Text x={137} y={548} size={15} fill={STOCK.muted}>
        {input.seriesLabel}
      </Text>
      {input.showReference ? (
        <>
          <circle cx={260} cy={543} r={4} fill={STOCK.cyan} fillOpacity={0.5} />
          <Text x={276} y={548} size={15} fill={STOCK.muted}>
            {input.referenceLabel}
          </Text>
        </>
      ) : null}
      <Text x={896} y={548} size={13} fill={STOCK.muted} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].samplePeriods,
        })}
      </Text>
    </g>
  );
}
