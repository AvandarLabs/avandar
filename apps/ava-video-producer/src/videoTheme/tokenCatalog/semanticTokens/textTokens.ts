import { token } from "../defineTokensHelpers";

function _graphicType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "graphic", label, description });
}
function _stageType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "stage", label, description });
}
/** A stage text role drawn on the scene palette rather than the ground. */
function _sceneType({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "typeStyle",
    surface: "stage",
    contrastGround: "color.scene.ground",
    label,
    description,
  });
}
/** Semantic text styles for graphics and for the stage. */
export const TEXT_TOKENS = {
  graphic: {
    eyebrow: _graphicType(
      "Eyebrow",
      "The small tracked label in the top-left corner of a graphic.",
    ),
    heading: _graphicType(
      "Graphic heading",
      "A heading drawn inside a graphic.",
    ),
    body: _graphicType("Graphic body", "Default text drawn inside a graphic."),
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
    figure: _graphicType(
      "Figure",
      "Large numerals such as a total or a count. A figure may set its own size as content.",
    ),
    value: _graphicType(
      "Value",
      "A short literal value drawn on its own, such as a cell value or a step's reading.",
    ),
    smallCaption: _graphicType(
      "Small caption",
      "A small muted caption under a block or a result, without the eyebrow's tracking.",
    ),
    mark: _graphicType(
      "Mark",
      "A large single symbol, such as the question mark over an open question.",
    ),
  },
  stage: {
    heading: _stageType("Stage heading", "The heading of a composition beat."),
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
    title: _sceneType({
      label: "Title card title",
      description: "The words of a title card, rising one by one.",
    }),
    kicker: _sceneType({
      label: "Title card kicker",
      description: "The line under a title card.",
    }),
    caption: _sceneType({
      label: "Film caption",
      description:
        "Captions over a storyboard film. Long captions fit down from this size.",
    }),
    sceneHeading: _sceneType({
      label: "Scene heading",
      description:
        "The heading of a scene study. It fits down from this size, and its tracking is measured at this size so it stays constant in pixels.",
    }),
    sceneBody: _sceneType({
      label: "Scene body",
      description:
        "Body lines in a scene: a scene's subtitle, metric details, and lockup lines.",
    }),
    cardTitle: _sceneType({
      label: "Scene card title",
      description:
        "The name on a card or node in a scene, such as a graph node.",
    }),
    figure: _sceneType({
      label: "Scene figure",
      description:
        "Large numerals in a scene, such as a metric or a bar value. A figure fits its own size.",
    }),
    windowHeadline: _sceneType({
      label: "Window headline",
      description:
        "The headline beside a tilted window. It fits down from this size.",
    }),
    barLabel: _sceneType({
      label: "Bar label",
      description: "The name beside a bar in a comparison.",
    }),
    badge: _sceneType({
      label: "Badge",
      description: "Short bold labels on a lockup, such as a version badge.",
    }),
    appTitle: _sceneType({
      label: "App title",
      description:
        "The page heading inside the app chrome of a fixed composition.",
    }),
    appBody: _sceneType({
      label: "App body",
      description:
        "Body and secondary text inside the app chrome of a fixed composition.",
    }),
    heroFigure: _sceneType({
      label: "Hero figure",
      description:
        "The one headline number a scene builds to, such as the bar comparison's result. It fits its own size.",
    }),
    wordmark: _sceneType({
      label: "Wordmark",
      description:
        "The brand name beside the mark in a lockup. It fits its own size to the mark.",
    }),
    command: _sceneType({
      label: "Command line",
      description:
        "A typed command, such as the install command under a lockup. It fits its own size.",
    }),
    windowSubtitle: _sceneType({
      label: "Window subtitle",
      description:
        "The monospace line under a window headline. It fits its own size.",
    }),
  },
} as const;
