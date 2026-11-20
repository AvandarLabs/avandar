import { token } from "../defineTokensHelpers";

function _color(label: string, description: string) {
  return token({ kind: "color", label, description });
}
function _sceneColor({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({ kind: "color", surface: "stage", label, description });
}
function _categorical(index: number) {
  return token({
    kind: "color",
    label: `Category ${index}`,
    description: `The colour of category ${index} in a key or series, so a category keeps one colour across a graphic.`,
  });
}
/**
 * The palette of storyboard scenes, the title card, the app chrome, and the
 * fixed compositions. `VideoThemeProvider` emits each one under the CSS name
 * scenes read, such as `--brand` for `brand` and `--muted-foreground` for
 * `mutedForeground`, so a storyboard theme can still override it per film or
 * per shot.
 */
const SCENE_COLOR_TOKENS = {
  background: _sceneColor({
    label: "Scene background",
    description:
      "The app background inside a scene: windows, panels, and the media frame.",
  }),
  foreground: _sceneColor({
    label: "Scene text",
    description: "Primary text and marks in a scene.",
  }),
  card: _sceneColor({
    label: "Scene card",
    description: "Fill of cards and nodes in a scene.",
  }),
  muted: _sceneColor({
    label: "Scene muted fill",
    description: "Quiet fills in a scene, such as tracks behind bars.",
  }),
  mutedForeground: _sceneColor({
    label: "Scene muted text",
    description:
      "Secondary text in a scene: details, units, and captions under values.",
  }),
  border: _sceneColor({
    label: "Scene border",
    description: "Borders and dividers in a scene.",
  }),
  brand: _sceneColor({
    label: "Scene accent",
    description:
      "The one accent of a scene: the mark, the leading bar, the active edge.",
  }),
  brandSoft: _sceneColor({
    label: "Scene soft accent",
    description:
      "A dark tint of the scene accent for rings and quiet highlights.",
  }),
  brandStrong: _sceneColor({
    label: "Scene strong accent",
    description:
      "A light tint of the scene accent for highlights on the accent.",
  }),
  ground: _sceneColor({
    label: "Scene ground",
    description: "The dark field a scene film opens, closes, and loops on.",
  }),
  shadow: token({
    kind: "color",
    surface: "stage",
    isOptional: true,
    label: "Scene shadow",
    description:
      "The colour of a cast shadow, for example under a tilted window. Unset, the shadow is the scene background at 60%.",
  }),
} as const;
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
  positive: _color(
    "Positive",
    "A settled, included, or confirmed state, and the default colour of person and object glyphs.",
  ),
  categorical: {
    1: _categorical(1),
    2: _categorical(2),
    3: _categorical(3),
    4: _categorical(4),
    5: _categorical(5),
    6: _categorical(6),
    7: _categorical(7),
    8: _categorical(8),
    9: _categorical(9),
  },
  onAccent: token({
    kind: "color",
    contrastWith: "color.accent",
    contrastThreshold: 0.179,
    label: "Text on accent",
    description:
      "Labels drawn on an accent fill: the on-dark value on a dark accent, the on-light value on a light one.",
  }),
  scene: SCENE_COLOR_TOKENS,
} as const;
