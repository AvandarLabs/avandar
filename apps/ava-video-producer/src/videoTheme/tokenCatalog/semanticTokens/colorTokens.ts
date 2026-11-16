import { token } from "../defineTokensHelpers";

function _color(label: string, description: string) {
  return token({ kind: "color", label, description });
}

/** Semantic colour roles: the ground, surfaces, text, and accents. */
export const COLOR_TOKENS = {
  ground: _color(
    "Ground",
    "The stage colour behind everything. Its luminance decides whether colour pairs use their on-dark or on-light value.",
  ),
  groundFill: token({
    kind: "fill",
    label: "Ground fill",
    description:
      "How the ground is painted: the ground colour, or the theme's ground gradient.",
  }),
  surface: _color(
    "Surface",
    "Fill of panels, nodes, and cards that sit on the ground.",
  ),
  elevated: _color(
    "Elevated surface",
    "Fill of a surface stacked on another surface, such as a card inside a panel.",
  ),
  line: _color("Line", "Edges, outlines, guides, and dividers."),
  text: _color("Text", "Primary text and labels."),
  textMuted: _color(
    "Muted text",
    "Secondary text: eyebrows, captions, and details.",
  ),
  inactive: _color(
    "Inactive",
    "Shapes that are present but not part of the current point, such as off-route nodes and closed gates.",
  ),
  accent: _color("Accent", "The path, packet, or object a motion is about."),
  accentAlt: _color(
    "Second accent",
    "A companion colour that alternates with the accent.",
  ),
  highlight: _color("Highlight", "A warm colour for one point of attention."),
  scrim: _color("Scrim", "The dimming layer around a spotlight."),
  productBackdrop: _color(
    "Product backdrop",
    "The backdrop around a reenactment. The product UI itself keeps the product theme.",
  ),
  shadowColor: _color("Shadow colour", "The colour of drop shadows."),
} as const;
