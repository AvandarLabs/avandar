import { buildColorWithAlpha } from "../../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { VIDEO_FONT_REGISTRY } from "../../../videoTheme/videoFontRegistry/videoFontRegistryHelpers";
import type { VideoShapeScales } from "../../../videoTheme/createVideoShapeScales/createVideoShapeScales";
import type { ResolvedVideoTheme } from "../../../videoTheme/videoTheme.types";
import type { CSSProperties } from "react";
/** The colours a helper preview draws with, by the part they paint. */
export type DemoColors = Readonly<{
  ground: string;
  panel: string;
  line: string;
  text: string;
  muted: string;
  brand: string;
  accent: string;
  highlight: string;
  success: string;
}>;
/**
 * Corners the preview chrome draws with no shared role, in pixels. Each
 * passes through the theme's corner style, so Look and feel reaches it.
 */
const PREVIEW_CORNERS = { span: 6, tab: 5 } as const;
/**
 * Strokes the preview chrome draws with no shared role, in pixels: the
 * eased trail behind a curve plot's dot. Each passes through the theme's
 * line weight.
 */
const PREVIEW_STROKES = { trail: 5 } as const;
/** How strongly a highlighted preview cell washes in the accent. */
const ACTIVE_CELL_WASH = 0.22;
/** The preview palette: the video theme's colour roles. */
function _getDemoColorsFromTheme(theme: ResolvedVideoTheme): DemoColors {
  const color = theme.semantic.color;
  return {
    ground: color.ground,
    panel: color.surface,
    line: color.line,
    text: color.text,
    muted: color.textMuted,
    brand: color.accent,
    accent: color.accentAlt,
    highlight: color.highlight,
    success: color.positive,
  };
}
/** The preview palette of the video theme in effect. */
function useDemoColors(): DemoColors {
  return _getDemoColorsFromTheme(useVideoTheme());
}
function _scaleVariables({
  prefix,
  scale,
}: Readonly<{
  prefix: string;
  scale: Readonly<Record<string, string | number>>;
}>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scale).map(([key, value]) => {
      return [`--demo-${prefix}-${key}`, String(value)];
    }),
  );
}
function _shapeVariables({
  theme,
  scales,
}: Readonly<{ theme: ResolvedVideoTheme; scales: VideoShapeScales }>): Record<
  string,
  string
> {
  const { corner, stroke } = theme.semantic;
  const strokes = {
    hairline: stroke.hairline,
    outline: stroke.outline,
    default: stroke.default,
    emphasis: stroke.emphasis,
    ...PREVIEW_STROKES,
  };
  const corners = {
    chip: corner.chip,
    cell: corner.cell,
    label: corner.label,
    card: corner.card,
    panel: corner.panel,
    pill: corner.pill,
    ...PREVIEW_CORNERS,
  };
  return {
    ...Object.fromEntries(
      Object.entries(corners).map(([name, radius]) => {
        return [`--demo-corner-${name}`, `${scales.corner(radius)}px`];
      }),
    ),
    ...Object.fromEntries(
      Object.entries(strokes).map(([name, width]) => {
        return [`--demo-stroke-${name}`, `${scales.stroke(width)}px`];
      }),
    ),
    "--demo-dash-guide": theme.atomic.dash.spaced.join(" "),
  };
}
/**
 * Custom properties for the preview CSS modules, all from the video theme:
 * the preview palette (`--demo-ground`, `--demo-brand`, ...), the stage and
 * monospace faces, the type, weight, and spacing scales
 * (`--demo-font-size-lg`, `--demo-font-weight-semibold`,
 * `--demo-space-2xs`), the tracking steps (`--demo-tracking-headline`), and
 * corners and strokes through the Look and feel
 * scales (`--demo-corner-card`, `--demo-stroke-hairline`), and the guide
 * dash (`--demo-dash-guide`). Set on every
 * preview root by `HelperDemoFrame`.
 */
function useDemoThemeStyle(): CSSProperties {
  const theme = useVideoTheme();
  const scales = useVideoShapeScales();
  const colors = _getDemoColorsFromTheme(theme);
  return {
    ...Object.fromEntries(
      Object.entries(colors).map(([name, value]) => {
        return [`--demo-${name}`, value];
      }),
    ),
    "--demo-brand-wash": buildColorWithAlpha(
      colors.brand,
      scales.wash(ACTIVE_CELL_WASH),
    ),
    "--demo-font": theme.semantic.text.stage.appBody.fontFamily,
    "--demo-mono":
      VIDEO_FONT_REGISTRY[theme.atomic.fontFamily.systemMono].stack,
    ..._scaleVariables({ prefix: "font-size", scale: theme.mantine.fontSizes }),
    ..._scaleVariables({
      prefix: "font-weight",
      scale: theme.atomic.fontWeight,
    }),
    ..._scaleVariables({ prefix: "space", scale: theme.mantine.spacing }),
    ..._scaleVariables({
      prefix: "tracking",
      scale: Object.fromEntries(
        Object.entries(theme.atomic.letterSpacing).map(([key, value]) => {
          return [key, `${value}em`];
        }),
      ),
    }),
    ..._shapeVariables({ theme, scales }),
  } as CSSProperties;
}
/** Formats a live readout value with a fixed number of decimals. */
function _formatReadout({
  value,
  digits = 2,
}: Readonly<{ value: number; digits?: number }>): string {
  return value.toFixed(digits);
}
/**
 * Provides themed helper-preview colors, CSS variables, and readout formatting.
 */
export const DemoTheme = {
  /** The preview palette: the video theme's colour roles. */
  getDemoColorsFromTheme: _getDemoColorsFromTheme,
  /** The preview palette of the video theme in effect. */
  useDemoColors,
  /** Custom properties for the preview CSS modules, all from the video theme:
    the preview palette (`--demo-ground`, `--demo-brand`, ...), the stage and
    monospace faces, the type, weight, and spacing scales
    (`--demo-font-size-lg`, `--demo-font-weight-semibold`,
    `--demo-space-2xs`), the tracking steps (`--demo-tracking-headline`), and
    corners and strokes through the Look and feel
    scales (`--demo-corner-card`, `--demo-stroke-hairline`), and the guide
    dash (`--demo-dash-guide`). Set on every
    preview root by `HelperDemoFrame`. */
  useDemoThemeStyle,
  /** Formats a live readout value with a fixed number of decimals. */
  formatReadout: _formatReadout,
};
