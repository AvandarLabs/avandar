import { token } from "./defineTokensHelpers";

const CAMERA_PRESET_OPTIONS = [
  "authored",
  "deliberate",
  "gentle",
  "balanced",
  "brisk",
  "whip",
] as const;

function _color(label: string, description: string) {
  return token({ kind: "color", label, description });
}

function _graphicType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "graphic", label, description });
}

function _stageType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "stage", label, description });
}

function _stroke(label: string, description: string) {
  return token({
    kind: "length",
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label,
    description,
  });
}

function _corner(label: string, description: string) {
  return token({
    kind: "length",
    unit: "px",
    min: 0,
    max: 9999,
    step: 1,
    label,
    description,
  });
}

function _sketch(label: string, description: string) {
  return token({ kind: "sketchProfile", label, description });
}

function _duration(label: string, description: string) {
  return token({
    kind: "duration",
    unit: "frames",
    min: 0,
    max: 120,
    step: 1,
    label,
    description,
  });
}

function _motionStep(label: string, description: string) {
  return token({ kind: "motionStep", label, description });
}

function _stagger(label: string, description: string) {
  return token({
    kind: "number",
    unit: "frames",
    min: 0,
    max: 30,
    step: 0.5,
    label,
    description,
  });
}

function _cameraPreset(name: string) {
  return token({
    kind: "cameraPreset",
    label: `${name} camera`,
    description: `Speed, shutter, and curve of the ${name.toLowerCase()} camera preset.`,
  });
}

function _easing(label: string, description: string) {
  return token({ kind: "easing", label, description });
}

/**
 * Semantic roles under `other.video.semantic`. A theme author sets these by
 * meaning ("the accent", "the caption style"); each one is a reference to
 * atomic or Mantine tokens, never a literal. Renderers read them through
 * `useVideoTokens` and CSS modules through `--video-*` variables.
 */
export const SEMANTIC_TOKENS = {
  color: {
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
  },
  text: {
    graphic: {
      eyebrow: _graphicType(
        "Eyebrow",
        "The small tracked label in the top-left corner of a graphic.",
      ),
      heading: _graphicType(
        "Graphic heading",
        "A heading drawn inside a graphic.",
      ),
      body: _graphicType(
        "Graphic body",
        "Default text drawn inside a graphic.",
      ),
      label: _graphicType("Label", "Names under nodes and other shapes."),
      detail: _graphicType(
        "Detail",
        "Small monospace values and annotations under a label.",
      ),
      caption: _graphicType(
        "Caption",
        "The one-line caption along the bottom of a graphic.",
      ),
      pill: _graphicType("Pill text", "Text inside a pill-shaped tag."),
      display: _graphicType(
        "Display",
        "The large heading of a graphic that states its subject.",
      ),
      title: _graphicType(
        "Title",
        "The name on a hub or destination at the centre of a graphic.",
      ),
      panelTitle: _graphicType(
        "Panel title",
        "The heading at the top of a panel.",
      ),
      cardTitle: _graphicType(
        "Card title",
        "The name on a stage card in a pipeline or sequence.",
      ),
      itemLabel: _graphicType(
        "Item label",
        "The name of a source or item in a list.",
      ),
      choice: _graphicType(
        "Choice",
        "The wording of an option or outcome in a decision.",
      ),
      question: _graphicType("Question", "The question a decision answers."),
      secondary: _graphicType(
        "Secondary text",
        "Supporting lines under a title, scenario, or selection.",
      ),
      note: _graphicType(
        "Note",
        "Small supporting text such as a stage detail or a short caption.",
      ),
      meta: _graphicType(
        "Meta",
        "Small monospace labels for inputs, outputs, and similar metadata.",
      ),
      footnote: _graphicType(
        "Footnote",
        "Monospace counts and notes along the edge of a graphic or window.",
      ),
      field: _graphicType("Field", "Monospace field and column names."),
      lineNumber: _graphicType("Line number", "Line numbers beside code."),
      code: _graphicType(
        "Code",
        "Code and other monospace text. Also the face of any text drawn as monospace.",
      ),
      data: _graphicType(
        "Data",
        "Exact data values and text fitted into fixed slots. Fitted text keeps its own size.",
      ),
    },
    stage: {
      heading: _stageType(
        "Stage heading",
        "The heading of a composition beat.",
      ),
      subtitle: _stageType("Stage subtitle", "The line under a beat heading."),
      evidence: _stageType(
        "Evidence",
        "Short evidence chips along the bottom of the stage.",
      ),
      sharedObject: _stageType(
        "Shared object text",
        "The text on an object that travels from one motion to the next.",
      ),
      thesis: _stageType(
        "Thesis",
        "Large statement lines that carry the argument of a composition.",
      ),
      thesisEmphasis: _stageType(
        "Thesis emphasis",
        "The supporting line under a thesis.",
      ),
      floatingLabel: _stageType(
        "Floating label",
        "A label anchored to a point on the stage.",
      ),
    },
  },
  stroke: {
    guide: _stroke(
      "Guide stroke",
      "Orbits, guides, and other construction lines.",
    ),
    hairline: _stroke(
      "Hairline stroke",
      "The thinnest outline, for hub rims, rows, and fine dividers.",
    ),
    outline: _stroke("Outline stroke", "Outlines of panels, nodes, and cards."),
    default: _stroke("Default stroke", "Edges, connectors, and drawn paths."),
    annotation: _stroke(
      "Annotation stroke",
      "Hand-drawn underlines and annotations.",
    ),
    route: _stroke("Route stroke", "A highlighted route through a diagram."),
  },
  corner: {
    panel: _corner("Panel corner", "Corner radius of panels inside a graphic."),
    pill: _corner("Pill corner", "Corner radius of pill-shaped tags."),
    card: _corner(
      "Card corner",
      "Corner radius of summary cards inside a graphic.",
    ),
    chip: _corner(
      "Chip corner",
      "Corner radius of evidence chips on the stage.",
    ),
    sharedObject: _corner(
      "Shared object corner",
      "Corner radius of an object that travels between motions.",
    ),
    spotlight: _corner(
      "Spotlight corner",
      "Corner radius of a spotlight cut-out.",
    ),
    label: _corner("Label corner", "Corner radius of a floating label."),
  },
  elevation: {
    flat: token({
      kind: "elevation",
      label: "Flat",
      description: "Surfaces that sit on the ground with no shadow.",
    }),
    floating: token({
      kind: "elevation",
      label: "Floating",
      description:
        "Surfaces that hover over the stage, such as floating labels and lifted diagrams.",
    }),
  },
  effect: {
    halo: token({
      kind: "glow",
      label: "Halo",
      description: "The soft glow around packets and highlighted points.",
    }),
  },
  sketch: {
    profile: {
      smooth: _sketch("Smooth", "Clean geometric lines."),
      subtle: _sketch("Subtle", "Lines with a slight hand-drawn wobble."),
      sketch: _sketch("Sketch", "Lines that read as drawn by hand."),
      rough: _sketch("Rough", "Loose, expressive hand-drawn lines."),
    },
    box: _sketch(
      "Box sketch",
      "The sketch profile boxes, panels, and pills use.",
    ),
    annotation: _sketch(
      "Annotation sketch",
      "The sketch profile underlines, brackets, and annotations use.",
    ),
    shape: _sketch(
      "Shape sketch",
      "The sketch profile nodes, edges, and guides use.",
    ),
  },
  layout: {
    graphic: {
      margin: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Graphic margin",
        description: "Distance from the edges of a graphic to its content.",
      }),
      eyebrowOrigin: token({
        kind: "box",
        surface: "graphic",
        label: "Eyebrow position",
        description:
          "Where the eyebrow baseline starts: x from the left edge and y from the top.",
      }),
      captionBaseline: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Caption baseline",
        description:
          "Distance from the bottom of a graphic to the baseline of its caption.",
      }),
    },
    stage: {
      headingInset: token({
        kind: "box",
        surface: "stage",
        label: "Heading inset",
        description:
          "Where the heading block of a beat sits: x from both sides and top from the top edge.",
      }),
      graphicInset: token({
        kind: "box",
        surface: "stage",
        label: "Graphic inset",
        description:
          "Where the graphic of a beat sits: x from both sides, plus top and bottom.",
      }),
      evidenceRow: token({
        kind: "box",
        surface: "stage",
        label: "Evidence row",
        description:
          "Where the evidence row sits: x from both sides, bottom from the bottom edge, and the gap between chips.",
      }),
    },
  },
  motion: {
    tempo: token({
      kind: "number",
      unit: "×",
      min: 0.8,
      max: 1.5,
      step: 0.05,
      label: "Tempo",
      description:
        "Divides every animation duration inside a beat. 1.5 is faster and 0.8 slower; timeline lengths never change.",
    }),
    press: _duration("Press", "A press answering back."),
    chip: _duration("Chip", "A chip changing state."),
    whip: _duration(
      "Whip",
      "A whip-out or wipe, shorter than a panel so the boundary reads as a cut.",
    ),
    panel: _duration("Panel", "A row, card, or panel arriving."),
    sheet: _duration("Sheet", "A sheet or full column arriving."),
    word: _duration("Word", "One word rising out of its mask."),
    hero: _duration("Hero", "The hero beat of a phase. Spend it once."),
    entrance: _motionStep(
      "Entrance",
      "How elements arrive: duration, curve, and rise distance.",
    ),
    exit: _motionStep(
      "Exit",
      "How elements leave: duration, curve, and travel distance.",
    ),
    emphasis: _motionStep(
      "Emphasis",
      "A spring landing for a value or card snapping into place.",
    ),
    drawOn: _motionStep("Draw on", "How edges and paths draw themselves in."),
    travel: _motionStep(
      "Travel",
      "The curve of something already on screen moving between landmarks.",
    ),
    pulse: _motionStep("Pulse", "The cycle of a breathing node or halo."),
    drift: _motionStep("Drift", "How far particles wander in a looping field."),
    packetFlow: _motionStep(
      "Packet flow",
      "The cycle of packets travelling along edges.",
    ),
    typing: _motionStep("Typing", "How fast typed text appears."),
    stagger: {
      list: _stagger("List stagger", "Frames between siblings in a list."),
      edge: _stagger("Edge stagger", "Frames between edges drawing in."),
      column: _stagger(
        "Column stagger",
        "Frames between neighbouring columns of a stepped wipe.",
      ),
    },
  },
  camera: {
    preset: token({
      kind: "enum",
      options: CAMERA_PRESET_OPTIONS,
      label: "Camera preset",
      description: "Authored camera timing, or one of the motion presets.",
    }),
    presets: {
      deliberate: _cameraPreset("Deliberate"),
      gentle: _cameraPreset("Gentle"),
      balanced: _cameraPreset("Balanced"),
      brisk: _cameraPreset("Brisk"),
      whip: _cameraPreset("Whip"),
    },
    easing: {
      push: _easing("Push curve", "The curve of a camera pushing in."),
      whip: _easing("Whip curve", "The curve of a fast camera whip."),
      glide: _easing(
        "Glide curve",
        "The curve of a camera gliding between framings.",
      ),
    },
    zoom: token({
      kind: "range",
      label: "Zoom limits",
      description: "The smallest and largest camera zoom.",
    }),
  },
  motionBlur: {
    shutter: token({
      kind: "number",
      unit: "deg",
      min: 0,
      max: 360,
      step: 5,
      label: "Shutter angle",
      description:
        "Shutter angle for camera motion blur when the camera follows its authored timing.",
    }),
    samples: token({
      kind: "number",
      min: 2,
      max: 16,
      step: 1,
      label: "Blur samples",
      description: "Sub-frames blended for camera motion blur.",
    }),
    velocityFactor: token({
      kind: "number",
      min: 0,
      max: 1,
      step: 0.01,
      label: "Velocity blur factor",
      description:
        "Blur pixels for each pixel of travel per frame in a single-object move.",
    }),
    velocityMax: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 20,
      step: 0.5,
      label: "Velocity blur limit",
      description: "The most blur a single-object move can get.",
    }),
    transitionBlur: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 48,
      step: 0.5,
      label: "Transition blur",
      description:
        "Peak blur of a spatial transition at full strength and a 180 degree shutter.",
    }),
  },
} as const;
