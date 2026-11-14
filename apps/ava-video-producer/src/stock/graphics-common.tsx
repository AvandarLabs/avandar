import { loopPhase, mix, ramp, wave } from "../motion";
import { StockRect } from "./primitives/StockRect/StockRect";
import {
  useGraphicFilter,
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "./theme/useGraphicTheme";
import type {
  ResolvedTypeStyle,
  ResolvedVideoSemantic,
} from "../videoTheme/videoTheme.types";
import type { CSSProperties, ReactNode } from "react";

export { STOCK } from "./stockPalette";

export type GraphicProps = {
  frame: number;
  accent: string;
  background?: string;
  id: string;
};
export type Point = { x: number; y: number };

/** Width of the stock viewBox. Right margins and centred text measure from it. */
export const GRAPHIC_WIDTH = 960;
/** Height of the stock viewBox. The caption baseline measures from it. */
export const GRAPHIC_HEIGHT = 600;

/** A graphic text role, such as `label` or `caption`. */
export type GraphicTextRole = keyof ResolvedVideoSemantic["text"]["graphic"];

/** Node sizes, each resolved through the `Node` radius tokens. */
export type NodeSize = "xs" | "sm" | "md" | "lg" | "xl";

const NODE_RADIUS_KEYS = {
  xs: "radiusXs",
  sm: "radiusSm",
  md: "radiusMd",
  lg: "radiusLg",
  xl: "radiusXl",
} as const;
const PACKET_FADE_IN_AT = 34;
const PACKET_EDGE_FADE = 10;

function _letterSpacing(
  style: ResolvedTypeStyle,
  fontSize: number,
): number | undefined {
  return style.letterSpacing === undefined
    ? undefined
    : Number((style.letterSpacing * fontSize).toFixed(4));
}

function _textStyle(style: ResolvedTypeStyle): CSSProperties | undefined {
  if (!style.textTransform && !style.fontVariantNumeric) {
    return undefined;
  }
  return {
    textTransform: style.textTransform,
    fontVariantNumeric: style.fontVariantNumeric,
  };
}

/**
 * SVG text in a graphic type role (`body` unless named). `size`, `fill`,
 * `weight`, and `spacing` are content overrides; `mono` draws in the code
 * role's face. Out-of-scope presets still pass sizes; in-scope presets name
 * a role.
 */
export function Text({
  x,
  y,
  children,
  role = "body",
  size,
  fill,
  anchor = "start",
  mono = false,
  weight,
  spacing,
}: {
  x: number;
  y: number;
  children: ReactNode;
  role?: GraphicTextRole;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  weight?: number;
  spacing?: number;
}) {
  const text = useGraphicTokens().text.graphic;
  const filter = useGraphicFilter(`text.graphic.${role}`);
  const style = text[role];
  const fontSize = size ?? style.fontSize;
  return (
    <text
      x={x}
      y={y}
      filter={filter}
      fill={fill ?? style.color}
      fillOpacity={style.alpha < 1 ? style.alpha : undefined}
      fontSize={fontSize}
      fontWeight={weight ?? style.fontWeight}
      textAnchor={anchor}
      fontFamily={mono ? text.code.fontFamily : style.fontFamily}
      letterSpacing={spacing ?? _letterSpacing(style, fontSize)}
      stroke={style.strokeWidth ? (fill ?? style.color) : undefined}
      strokeWidth={style.strokeWidth}
      paintOrder={style.strokeWidth ? "stroke" : undefined}
      style={_textStyle(style)}
    >
      {children}
    </text>
  );
}

/** The small tracked label at the theme's eyebrow origin. */
export function Eyebrow({
  children,
  x,
  y,
  fill,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  fill?: string;
}) {
  const origin = useGraphicTokens().layout.graphic.eyebrowOrigin;
  return (
    <Text
      role="eyebrow"
      x={x ?? origin.x ?? 0}
      y={y ?? origin.y ?? 0}
      fill={fill}
    >
      {children}
    </Text>
  );
}

/** The one-line caption, centred on the canvas at the theme's caption baseline. */
export function Caption({
  children,
  x = GRAPHIC_WIDTH / 2,
  anchor = "middle",
}: {
  children: ReactNode;
  x?: number;
  anchor?: "start" | "middle" | "end";
}) {
  const baseline = useGraphicTokens().layout.graphic.captionBaseline;
  return (
    <Text role="caption" x={x} y={GRAPHIC_HEIGHT - baseline} anchor={anchor}>
      {children}
    </Text>
  );
}

/** A themed panel; `stroke`, `fill`, and `radius` are content overrides. */
export function Panel({
  x,
  y,
  width,
  height,
  children,
  stroke,
  fill,
  radius,
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
  const panel = useGraphicProps("Panel", { stroke, fill, radius });
  const filter = useGraphicFilter("components.Panel.elevation");
  return (
    <g filter={filter}>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={panel.radius}
        fill={panel.fill}
        stroke={panel.stroke}
        strokeWidth={panel.strokeWidth}
      />
      {children}
    </g>
  );
}

/** A tinted summary card for labels that outgrow a pill. */
export function Card({
  x,
  y,
  width,
  height,
  color,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  children?: ReactNode;
}) {
  const card = useGraphicProps("Card", {});
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={card.radius}
        fill={color}
        fillOpacity={card.fillAlpha}
        stroke={color}
        strokeOpacity={card.strokeAlpha}
      />
      {children}
    </g>
  );
}

/** A themed pill-shaped tag; `color` and `width` are content overrides. */
export function Pill({
  x,
  y,
  text,
  color,
  width,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  width?: number;
}) {
  const pill = useGraphicProps("Pill", { color, width });
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={pill.width}
        height={pill.height}
        rx={Math.min(pill.radius, pill.height / 2)}
        fill={pill.color}
        fillOpacity={pill.fillAlpha}
        stroke={pill.color}
        strokeOpacity={pill.strokeAlpha}
      />
      <Text
        role="pill"
        x={x + pill.width / 2}
        y={y + pill.textBaseline}
        fill={pill.color}
        anchor="middle"
      >
        {text}
      </Text>
    </g>
  );
}

/** Fades and rises children in with the theme's entrance motion. */
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
  const motion = useGraphicMotion();
  const t = ramp(
    frame,
    at + index * motion.stagger.list,
    motion.entrance.duration,
    motion.entrance.easing,
  );
  return (
    <g
      opacity={t}
      transform={`translate(0 ${mix(t, motion.entrance.distance, 0)})`}
    >
      {children}
    </g>
  );
}

/**
 * A curved path between two points. `tension` places the control points;
 * themed shapes pass their `curveTension` token. Pure, so out-of-scope
 * presets can keep calling it for `d` strings.
 */
export function Curve({
  from,
  to,
  bend = 0,
  tension = 0.45,
}: {
  from: Point;
  to: Point;
  bend?: number;
  tension?: number;
}) {
  return `M${from.x},${from.y} C${mix(tension, from.x, to.x)},${from.y + bend} ${mix(1 - tension, from.x, to.x)},${to.y + bend} ${to.x},${to.y}`;
}

/**
 * A themed edge that draws itself in. Give `d`, or `curve` to curve with the
 * theme's tension. `duration` is a content length that tempo still scales.
 */
export function DrawPath({
  d,
  curve,
  frame,
  at = 20,
  duration,
  color,
  width,
  opacity = 1,
  dashed = false,
}: {
  d?: string;
  curve?: Readonly<{ from: Point; to: Point; bend?: number }>;
  frame: number;
  at?: number;
  duration?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const edge = useGraphicProps("Edge", { color, strokeWidth: width });
  const motion = useGraphicMotion();
  const path =
    d ?? (curve ? Curve({ ...curve, tension: edge.curveTension }) : "");
  const t = ramp(
    frame,
    at,
    motion.scale(duration ?? edge.drawDuration),
    motion.curve(edge.drawEasing),
  );
  return (
    <path
      d={path}
      pathLength={1}
      fill="none"
      stroke={edge.color}
      strokeWidth={edge.strokeWidth}
      strokeLinecap={edge.cap}
      strokeDasharray={dashed ? edge.dash.join(" ") : 1}
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

/** The theme's soft disc around a point, such as a packet's halo. */
export function Halo({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  const { glow } = useGraphicProps("Halo", {});
  const filter = useGraphicFilter("components.Halo.glow");
  return (
    <circle
      filter={filter}
      cx={cx}
      cy={cy}
      r={r + glow.spread}
      fill={color}
      fillOpacity={glow.opacity}
    />
  );
}

/** A themed packet looping along a curved edge, with its halo. */
export function Packet({
  frame,
  from,
  to,
  color,
  delay = 0,
  period,
  size = "md",
  radius,
  bend = 0,
}: {
  frame: number;
  from: Point;
  to: Point;
  color?: string;
  delay?: number;
  period?: number;
  size?: "sm" | "md";
  /** A content override that out-of-scope presets may pass. */
  radius?: number;
  bend?: number;
}) {
  const packet = useGraphicProps("Packet", { color, period });
  const motion = useGraphicMotion();
  const r = radius ?? (size === "sm" ? packet.radiusSm : packet.radius);
  const t = loopPhase(frame, packet.period, delay);
  const point = cubicPoint(
    from,
    { x: mix(packet.curveTension, from.x, to.x), y: from.y + bend },
    { x: mix(1 - packet.curveTension, from.x, to.x), y: to.y + bend },
    to,
    t,
  );
  const opacity =
    ramp(frame, PACKET_FADE_IN_AT, motion.scale(packet.fadeIn)) *
    Math.min(1, t * PACKET_EDGE_FADE, (1 - t) * PACKET_EDGE_FADE);
  return (
    <g opacity={opacity}>
      <Halo cx={point.x} cy={point.y} r={r} color={packet.color} />
      <circle cx={point.x} cy={point.y} r={r} fill={packet.color} />
    </g>
  );
}

/** A themed highlighted route segment that grows with `progress`. */
export function Route({
  from,
  to,
  progress,
  frame,
  at,
  color,
}: {
  from: Point;
  to: Point;
  progress: number;
  frame: number;
  at: number;
  color: string;
}) {
  const route = useGraphicProps("Route", {});
  const motion = useGraphicMotion();
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={mix(progress, from.x, to.x)}
      y2={mix(progress, from.y, to.y)}
      stroke={color}
      strokeWidth={route.strokeWidth}
      strokeLinecap={route.cap}
      opacity={ramp(frame, at, motion.scale(route.fadeIn))}
    />
  );
}

/** A themed dashed guide ellipse, such as an orbit. */
export function Guide({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  const guide = useGraphicProps("Guide", {});
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={guide.color}
      strokeWidth={guide.strokeWidth}
      strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined}
      opacity={guide.alpha}
    />
  );
}

/** A themed horizontal divider. */
export function Rule({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const rule = useGraphicProps("Rule", {});
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke={rule.color}
      strokeWidth={rule.strokeWidth}
    />
  );
}

/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }) {
  const glyph = useGraphicProps("Glyph", {});
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={glyph.strokeWidth} />
  );
}

/** A themed, twinkling ambient particle with an optional halo. */
export function Particle({
  x,
  y,
  frame,
  phase,
  color,
  haloColor,
  isLarge,
}: {
  x: number;
  y: number;
  frame: number;
  phase: number;
  color: string;
  haloColor: string;
  isLarge: boolean;
}) {
  const particle = useGraphicProps("Particle", {});
  const floor = particle.twinkleFloor;
  return (
    <g
      opacity={floor + wave(frame, particle.twinklePeriod, phase) * (1 - floor)}
    >
      {isLarge ? (
        <circle
          cx={x}
          cy={y}
          r={particle.haloRadius}
          fill={haloColor}
          fillOpacity={particle.haloAlpha}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={isLarge ? particle.radiusLg : particle.radius}
        fill={color}
      />
    </g>
  );
}

/**
 * A themed node: active ring, outline, accent tint, centre dot, label, and
 * optional detail. `size` picks a themed radius; `radius` is a content
 * override that out-of-scope presets still pass.
 */
export function CircleNode({
  x,
  y,
  label,
  detail,
  frame,
  index = 0,
  accent,
  active = 0,
  size = "md",
  radius,
}: {
  x: number;
  y: number;
  label: string;
  detail?: string;
  frame: number;
  index?: number;
  accent: string;
  active?: number;
  size?: NodeSize;
  radius?: number;
}) {
  const node = useGraphicProps("Node", {});
  const r = radius ?? node[NODE_RADIUS_KEYS[size]];
  return (
    <Arrive frame={frame} index={index}>
      <circle
        cx={x}
        cy={y}
        r={r + node.ringSpread}
        fill="none"
        stroke={accent}
        strokeOpacity={active * node.ringAlpha}
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={accent}
        fillOpacity={active * node.tintAlpha}
        stroke={accent}
        strokeOpacity={node.outlineAlpha + active * (1 - node.outlineAlpha)}
        strokeWidth={node.strokeWidth}
      />
      <circle
        cx={x}
        cy={y}
        r={node.coreRadius + active * node.coreGrowth}
        fill={accent}
      />
      <Text role="label" x={x} y={y + r + node.labelOffset} anchor="middle">
        {label}
      </Text>
      {detail ? (
        <Text role="detail" x={x} y={y + r + node.detailOffset} anchor="middle">
          {detail}
        </Text>
      ) : null}
    </Arrive>
  );
}

/** A themed check mark; `color` and `size` are content overrides. */
export function Check({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color?: string;
  size?: number;
}) {
  const check = useGraphicProps("Check", { color, size });
  const s = check.size;
  return (
    <path
      d={`M${x - s * 0.5} ${y} l${s * 0.35} ${s * 0.36} l${s * 0.7} ${-s * 0.8}`}
      fill="none"
      stroke={check.color}
      strokeWidth={check.strokeWidth}
      strokeLinecap={check.cap}
      strokeLinejoin={check.join}
    />
  );
}
