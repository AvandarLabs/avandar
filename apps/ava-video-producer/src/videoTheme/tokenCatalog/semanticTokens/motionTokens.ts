import { token } from "../defineTokensHelpers";

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

/** Semantic motion timing: durations, steps, and staggers. */
export const MOTION_TOKENS = {
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
} as const;
