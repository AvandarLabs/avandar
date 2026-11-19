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

function _loopFade(label: string, description: string) {
  return token({
    kind: "duration",
    unit: "frames",
    min: 1,
    max: 30,
    step: 1,
    label,
    description,
  });
}

function _multiplier(label: string, description: string, max: number) {
  return token({
    kind: "number",
    unit: "×",
    min: 0,
    max,
    step: 0.1,
    label,
    description,
  });
}

/** The curve families `motion.easingProfile` chooses between. */
export const EASING_PROFILE_OPTIONS = [
  "authored",
  "smooth",
  "snappy",
  "gentle",
] as const;

/** What the themed `enter()` animates besides opacity. */
export const ENTRANCE_STYLE_OPTIONS = [
  "rise",
  "fade",
  "scale",
  "none",
] as const;

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
  reveal: _motionStep(
    "Reveal",
    "How an element fades in on its cue: duration and curve.",
  ),
  rise: _motionStep(
    "Rise",
    "Words, lines, bars, and columns rising in one after another: duration, curve, and stagger.",
  ),
  depart: _motionStep(
    "Depart",
    "An accelerating departure, such as a window whipped off the frame.",
  ),
  surge: _motionStep(
    "Surge",
    "The curve of a fly-through that lingers, surges, and settles.",
  ),
  dissolve: _motionStep(
    "Dissolve",
    "The curve of a dissolve between shots and of a loop fading to its ground.",
  ),
  loopFade: {
    graphic: _loopFade(
      "Graphic loop fade",
      "Frames a stock graphic takes to fade from and back to its ground at each end of its loop. Tempo never changes it.",
    ),
    film: _loopFade(
      "Film loop fade",
      "Frames a looping film takes to fade from and back to its ground. Tempo never changes it.",
    ),
  },
  pressDepth: token({
    kind: "number",
    min: 0,
    max: 0.2,
    step: 0.005,
    label: "Press depth",
    description:
      "How far a pressed element shrinks, as a fraction of its size.",
  }),
  caret: {
    halfPeriod: token({
      kind: "duration",
      unit: "frames",
      min: 4,
      max: 30,
      step: 1,
      label: "Caret blink",
      description: "Frames a typing caret stays on, and then off.",
    }),
  },
  easingProfile: token({
    kind: "enum",
    options: EASING_PROFILE_OPTIONS,
    label: "Easing family",
    description:
      "Authored curves, or one family whose curve replaces the entrance, exit, travel, rise, and reveal curves.",
  }),
  easingProfiles: {
    smooth: token({
      kind: "easing",
      label: "Smooth curve",
      description: "The curve of the smooth easing family.",
    }),
    snappy: token({
      kind: "easing",
      label: "Snappy curve",
      description: "The curve of the snappy easing family.",
    }),
    gentle: token({
      kind: "easing",
      label: "Gentle curve",
      description: "The curve of the gentle easing family.",
    }),
  },
  staggerScale: _multiplier(
    "Stagger",
    "Multiplies every stagger, so siblings arrive tighter or looser. 1 keeps them as authored.",
    3,
  ),
  entranceStyle: token({
    kind: "enum",
    options: ENTRANCE_STYLE_OPTIONS,
    label: "Entrance style",
    description:
      "What an entrance animates besides opacity: a rise, a plain fade, a scale up, or nothing, so elements appear on their cue.",
  }),
  stagger: {
    list: _stagger("List stagger", "Frames between siblings in a list."),
    edge: _stagger("Edge stagger", "Frames between edges drawing in."),
    column: _stagger(
      "Column stagger",
      "Frames between neighbouring columns of a stepped wipe.",
    ),
  },
} as const;
