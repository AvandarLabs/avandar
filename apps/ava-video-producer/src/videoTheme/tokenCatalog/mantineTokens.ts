import { scale, token } from "./defineTokens";

const PALETTE_NAMES = [
  "primary",
  "neutral",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
] as const;

function _palette(label: string, description: string) {
  return token({ kind: "colorTuple", label, description });
}

function _headingLevel(role: string) {
  return {
    fontSize: token({
      kind: "cssLength",
      unit: "px",
      min: 8,
      max: 200,
      step: 1,
      label: `${role} size`,
      description: `Font size of the ${role.toLowerCase()} heading level on the stage.`,
    }),
    fontWeight: token({
      kind: "cssNumber",
      min: 100,
      max: 900,
      step: 100,
      label: `${role} weight`,
      description: `Weight of the ${role.toLowerCase()} heading level on the stage.`,
    }),
    lineHeight: token({
      kind: "cssNumber",
      min: 0.8,
      max: 2,
      step: 0.01,
      label: `${role} line height`,
      description: `Line height of the ${role.toLowerCase()} heading level on the stage.`,
    }),
  };
}

/**
 * Mantine-native theme keys a video theme sets, at the top level of a theme
 * file exactly where Mantine expects them. They are atomic: semantic tokens
 * reference them, for example `$colors.primary.4` or `$fontSizes.md`.
 */
export const MANTINE_TOKENS = {
  colors: {
    primary: _palette(
      "Primary palette",
      "Ten shades of the brand colour, lightest first. The accent reads one of them through the primary shade.",
    ),
    neutral: _palette(
      "Neutral palette",
      "Ten shades of the cool grey that carries muted text on light grounds.",
    ),
    secondary: _palette("Secondary palette", "Ten shades of the warm companion colour."),
    success: _palette("Success palette", "Ten shades of green for positive outcomes."),
    warning: _palette("Warning palette", "Ten shades of yellow for caution."),
    danger: _palette("Danger palette", "Ten shades of red for errors and losses."),
    info: _palette("Info palette", "Ten shades of cyan for neutral information."),
  },
  white: token({
    kind: "color",
    label: "White",
    description: "The white Mantine mixes into derived colours.",
  }),
  black: token({
    kind: "color",
    label: "Black",
    description: "The black Mantine mixes into derived colours.",
  }),
  primaryColor: token({
    kind: "paletteName",
    options: PALETTE_NAMES,
    label: "Primary palette name",
    description: "Which palette is primary. The accent comes from this palette.",
  }),
  primaryShade: token({
    kind: "shade",
    min: 0,
    max: 9,
    step: 1,
    label: "Primary shade",
    description:
      "The primary palette shade used as the accent: one shade on dark grounds and one on light grounds.",
  }),
  defaultGradient: token({
    kind: "gradient",
    label: "Ground gradient",
    description: "The gradient a ground fill uses when it is not a solid colour.",
  }),
  fontFamily: token({
    kind: "fontStack",
    label: "Body font stack",
    description: "Mantine's body font. It must be the stack of a registered font.",
  }),
  fontFamilyMonospace: token({
    kind: "fontStack",
    label: "Monospace font stack",
    description: "Mantine's monospace font. It must be the stack of a registered font.",
  }),
  headings: {
    fontFamily: token({
      kind: "fontStack",
      label: "Heading font stack",
      description: "Mantine's heading font. It must be the stack of a registered font.",
    }),
    fontWeight: token({
      kind: "cssNumber",
      min: 100,
      max: 900,
      step: 100,
      label: "Heading weight",
      description: "Default weight of Mantine heading levels.",
    }),
    sizes: { h1: _headingLevel("Thesis"), h2: _headingLevel("Heading") },
  },
  fontSizes: scale({
    kind: "cssLength",
    unit: "px",
    min: 8,
    max: 160,
    step: 1,
    label: "Font size",
    description: "A step of the type scale, in pixels of the surface that draws the text.",
  }),
  lineHeights: scale({
    kind: "cssNumber",
    min: 0.8,
    max: 2.4,
    step: 0.01,
    label: "Line height",
    description: "A line height step, as a multiple of the font size.",
  }),
  radius: scale({
    kind: "cssLength",
    unit: "px",
    min: 0,
    max: 9999,
    step: 1,
    label: "Radius",
    description: "A corner radius step, in pixels. The full step rounds a shape into a pill.",
  }),
  spacing: scale({
    kind: "cssLength",
    unit: "px",
    min: 0,
    max: 600,
    step: 1,
    label: "Spacing",
    description: "A spacing step used by layout insets and gaps, in pixels of the surface.",
  }),
  autoContrast: token({
    kind: "boolean",
    label: "Mantine auto contrast",
    description: "Whether Mantine picks readable text on its own filled components.",
  }),
  luminanceThreshold: token({
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Dark ground threshold",
    description:
      "Grounds whose luminance is below this count as dark, so colour pairs use their on-dark value.",
  }),
  fontSmoothing: token({
    kind: "boolean",
    label: "Font smoothing",
    description: "Whether Mantine applies antialiased font smoothing.",
  }),
} as const;
