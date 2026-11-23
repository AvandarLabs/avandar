import { token } from "../defineTokensHelpers";

function _graphicType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "graphic", label, description });
}

function _stageType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "stage", label, description });
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
  },
} as const;
