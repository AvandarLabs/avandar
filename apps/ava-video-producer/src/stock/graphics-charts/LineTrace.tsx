import { mix } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { LineTraceInput } from "../presets/LineTrace/LineTrace.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: LineTraceInput };
const TRACE_AT = 23;
const TRACE_FRAMES = 94;
const HEADING_SIZE = "29";
const SAMPLE_NOTE_SIZE = "2xs";
/** Draws the bounded authored line-trace study at an explicit frame. */
export function LineTrace({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, dash, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const points = input.points;
  const chartPoint = (value: number, index: number) => {
    return {
      x: 121 + index * (718 / (points.length - 1)),
      y: 458 - value * 3.1,
    };
  };
  const tracePath = points
    .map((value, index) => {
      return `${index ? "L" : "M"}${chartPoint(value, index).x} ${chartPoint(value, index).y}`;
    })
    .join(" ");
  const referencePath = input.reference
    .map((value, index) => {
      return `${index ? "L" : "M"}${chartPoint(value, index).x} ${chartPoint(value, index).y}`;
    })
    .join(" ");
  const t = motion.ramp(
    frame,
    TRACE_AT,
    motion.scale(TRACE_FRAMES),
    motion.travel.easing,
  );
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
          <stop
            offset="0"
            stopColor={accent}
            stopOpacity={shapes.wash(atomic.opacity["15"])}
          />
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
      <Text role="title" x={64} y={111} size={HEADING_SIZE}>
        {input.heading}
      </Text>
      {[0, 25, 50, 75, 100].map((value) => {
        return (
          <g key={value}>
            <SketchedShape
              shape={{ kind: "path", d: `M121 ${458 - value * 3.1} H839` }}
              profile={sketch.shape}
              stroke={color.line}
              strokeOpacity={atomic.opacity["60"]}
              strokeWidth={shapes.stroke(stroke.hairline)}
            />
            <Text role="pill" x={99} y={463 - value * 3.1} anchor="end">
              {value}
            </Text>
          </g>
        );
      })}
      {input.showReference ? (
        <SketchedShape
          shape={{ kind: "path", d: referencePath }}
          profile={sketch.shape}
          fill="none"
          stroke={color.accentAlt}
          strokeOpacity={atomic.opacity["38"]}
          strokeWidth={shapes.stroke(stroke.default)}
          strokeDasharray={atomic.dash.boundary.join(" ")}
        />
      ) : null}
      <g clipPath={`url(#${id}-chart-clip)`}>
        <path
          d={`${tracePath} L839 458 H121 Z`}
          fill={`url(#${id}-chart-fill)`}
        />
        <SketchedShape
          shape={{ kind: "path", d: tracePath }}
          profile={sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={shapes.stroke(stroke.route)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((v, i) => {
          return (
            <circle
              key={i}
              cx={chartPoint(v, i).x}
              cy={chartPoint(v, i).y}
              r={3}
              fill={accent}
            />
          );
        })}
      </g>
      <SketchedShape
        shape={{ kind: "path", d: `M${head.x} ${head.y} V458` }}
        profile={sketch.shape}
        stroke={accent}
        strokeOpacity={atomic.opacity["22"]}
        strokeWidth={shapes.stroke(stroke.hairline)}
        strokeDasharray={dash.guide.join(" ")}
      />
      <circle
        cx={head.x}
        cy={head.y}
        r={12}
        fill={accent}
        fillOpacity={shapes.wash(atomic.opacity["10"])}
      />
      <circle cx={head.x} cy={head.y} r={5.5} fill={accent} />
      <Text role="footnote" x={121} y={491}>
        01
      </Text>
      <Text role="footnote" x={839} y={491} anchor="end">
        {String(points.length).padStart(2, "0")}
      </Text>
      <circle cx={121} cy={543} r={4} fill={accent} />
      <Text role="note" x={137} y={548}>
        {input.seriesLabel}
      </Text>
      {input.showReference ? (
        <>
          <circle
            cx={260}
            cy={543}
            r={4}
            fill={color.accentAlt}
            fillOpacity={atomic.opacity["50"]}
          />
          <Text role="note" x={276} y={548}>
            {input.referenceLabel}
          </Text>
        </>
      ) : null}
      <Text role="note" x={896} y={548} size={SAMPLE_NOTE_SIZE} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].samplePeriods,
        })}
      </Text>
    </g>
  );
}
