import { DUR, EASE, loopPhase, mix, ramp, STAGGER } from "../motion";
import type { ReactNode } from "react";

/** Palette belongs to these fictional stock studies, not to a product theme. */
export const STOCK = {
  ground: "#0b1219",
  surface: "#101e28",
  elevated: "#142632",
  line: "#2a404e",
  muted: "#728794",
  text: "#edf7f4",
  mint: "#9fefca",
  cyan: "#82c8f2",
  orange: "#f0ba83",
} as const;

export type GraphicProps = {
  frame: number;
  accent: string;
  background?: string;
  id: string;
};
export type Point = { x: number; y: number };

export function Text({
  x,
  y,
  children,
  size = 20,
  fill = STOCK.text,
  anchor = "start",
  mono = false,
  weight = 400,
  spacing,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  weight?: number;
  spacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      fontFamily={mono ? "'Courier New', monospace" : "Arial, sans-serif"}
      letterSpacing={spacing}
    >
      {children}
    </text>
  );
}

export function Eyebrow({
  children,
  x = 64,
  y = 64,
  fill = STOCK.muted,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  fill?: string;
}) {
  return (
    <Text x={x} y={y} size={14} fill={fill} spacing={2.4}>
      {children}
    </Text>
  );
}

export function Panel({
  x,
  y,
  width,
  height,
  children,
  stroke = STOCK.line,
  fill = STOCK.surface,
  radius = 18,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  stroke?: string;
  fill?: string;
  radius?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {children}
    </g>
  );
}

export function Pill({
  x,
  y,
  text,
  color = STOCK.muted,
  width = 114,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  width?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={30}
        rx={15}
        fill={color}
        fillOpacity={0.08}
        stroke={color}
        strokeOpacity={0.32}
      />
      <Text
        x={x + width / 2}
        y={y + 20}
        size={13}
        fill={color}
        anchor="middle"
        mono
      >
        {text}
      </Text>
    </g>
  );
}

export function Arrive({
  frame,
  at = 12,
  index = 0,
  children,
}: {
  frame: number;
  at?: number;
  index?: number;
  children: ReactNode;
}) {
  const t = ramp(frame, at + index * STAGGER, DUR.panel);
  return (
    <g opacity={t} transform={`translate(0 ${mix(t, 12, 0)})`}>
      {children}
    </g>
  );
}

export function DrawPath({
  d,
  frame,
  at = 20,
  duration = DUR.hero,
  color = STOCK.line,
  width = 2,
  opacity = 1,
  dashed = false,
}: {
  d: string;
  frame: number;
  at?: number;
  duration?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const t = ramp(frame, at, duration, EASE.inOut);
  return (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dashed ? "0.015 0.02" : 1}
      strokeDashoffset={dashed ? 0 : 1 - t}
      opacity={opacity * (dashed ? t : 1)}
    />
  );
}

/** Geometry only: the shared frame helpers supply the motion. */
export function cubicPoint(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y:
      u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}

export function Packet({
  frame,
  from,
  to,
  color = STOCK.mint,
  delay = 0,
  period = 75,
  radius = 4,
  bend = 0,
}: {
  frame: number;
  from: Point;
  to: Point;
  color?: string;
  delay?: number;
  period?: number;
  radius?: number;
  bend?: number;
}) {
  const t = loopPhase(frame, period, delay);
  const point = cubicPoint(
    from,
    { x: mix(0.45, from.x, to.x), y: from.y + bend },
    { x: mix(0.55, from.x, to.x), y: to.y + bend },
    to,
    t,
  );
  const opacity =
    ramp(frame, 34, DUR.sheet) * Math.min(1, t * 10, (1 - t) * 10);
  return (
    <g opacity={opacity}>
      <circle
        cx={point.x}
        cy={point.y}
        r={radius + 5}
        fill={color}
        fillOpacity={0.09}
      />
      <circle cx={point.x} cy={point.y} r={radius} fill={color} />
    </g>
  );
}

export function Curve({
  from,
  to,
  bend = 0,
}: {
  from: Point;
  to: Point;
  bend?: number;
}) {
  return `M${from.x},${from.y} C${mix(0.45, from.x, to.x)},${from.y + bend} ${mix(0.55, from.x, to.x)},${to.y + bend} ${to.x},${to.y}`;
}

export function CircleNode({
  x,
  y,
  label,
  detail,
  frame,
  index = 0,
  accent,
  active = 0,
  radius = 26,
}: {
  x: number;
  y: number;
  label: string;
  detail?: string;
  frame: number;
  index?: number;
  accent: string;
  active?: number;
  radius?: number;
}) {
  return (
    <Arrive frame={frame} index={index}>
      <circle
        cx={x}
        cy={y}
        r={radius + 9}
        fill="none"
        stroke={accent}
        strokeOpacity={active * 0.25}
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={1.5}
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={accent}
        fillOpacity={active * 0.09}
        stroke={accent}
        strokeOpacity={0.28 + active * 0.72}
        strokeWidth={1.5}
      />
      <circle cx={x} cy={y} r={5 + active * 2} fill={accent} />
      <Text x={x} y={y + radius + 30} size={18} anchor="middle">
        {label}
      </Text>
      {detail ? (
        <Text
          x={x}
          y={y + radius + 51}
          size={12}
          anchor="middle"
          fill={STOCK.muted}
          mono
        >
          {detail}
        </Text>
      ) : null}
    </Arrive>
  );
}

export function Check({
  x,
  y,
  color = STOCK.mint,
  size = 12,
}: {
  x: number;
  y: number;
  color?: string;
  size?: number;
}) {
  return (
    <path
      d={`M${x - size * 0.5} ${y} l${size * 0.35} ${size * 0.36} l${size * 0.7} ${-size * 0.8}`}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
