import { TokenDefinitions } from "../TokenDefinitions";

function _duration({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return TokenDefinitions.token({
    kind: "duration",
    unit: "frames",
    min: 0,
    max: 120,
    step: 1,
    label,
    description,
  });
}
function _motionStep({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return TokenDefinitions.token({ kind: "motionStep", label, description });
}
function _stagger({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return TokenDefinitions.token({
    kind: "number",
    unit: "frames",
    min: 0,
    max: 30,
    step: 0.5,
    label,
    description,
  });
}
function _loopFade({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return TokenDefinitions.token({
    kind: "duration",
    unit: "frames",
    min: 1,
    max: 30,
    step: 1,
    label,
    description,
  });
}
function _multiplier({
  label,
  description,
  max,
}: Readonly<{
  label: string;
  description: string;
  max: number;
}>) {
  return TokenDefinitions.token({
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
  tempo: TokenDefinitions.token({
    kind: "number",
    unit: "×",
    min: 0.8,
    max: 1.5,
    step: 0.05,
    label: "Tempo",
    description:
      "Divides every animation duration inside a beat. 1.5 is faster and 0.8 slower; timeline lengths never change.",
  }),
  press: _duration({
    label: "Press",
    description: "A press answering back.",
  }),
  chip: _duration({
    label: "Chip",
    description: "A chip changing state.",
  }),
  whip: _duration({
    label: "Whip",
    description:
      "A whip-out or wipe, shorter than a panel so the boundary reads as a cut.",
  }),
  panel: _duration({
    label: "Panel",
    description: "A row, card, or panel arriving.",
  }),
  sheet: _duration({
    label: "Sheet",
    description: "A sheet or full column arriving.",
  }),
  word: _duration({
    label: "Word",
    description: "One word rising out of its mask.",
  }),
  hero: _duration({
    label: "Hero",
    description: "The hero beat of a phase. Spend it once.",
  }),
  entrance: _motionStep({
    label: "Entrance",
    description: "How elements arrive: duration, curve, and rise distance.",
  }),
  exit: _motionStep({
    label: "Exit",
    description: "How elements leave: duration, curve, and travel distance.",
  }),
  emphasis: _motionStep({
    label: "Emphasis",
    description: "A spring landing for a value or card snapping into place.",
  }),
  drawOn: _motionStep({
    label: "Draw on",
    description: "How edges and paths draw themselves in.",
  }),
  travel: _motionStep({
    label: "Travel",
    description:
      "The curve of something already on screen moving between landmarks.",
  }),
  pulse: _motionStep({
    label: "Pulse",
    description: "The cycle of a breathing node or halo.",
  }),
  drift: _motionStep({
    label: "Drift",
    description: "How far particles wander in a looping field.",
  }),
  packetFlow: _motionStep({
    label: "Packet flow",
    description: "The cycle of packets travelling along edges.",
  }),
  typing: _motionStep({
    label: "Typing",
    description: "How fast typed text appears.",
  }),
  reveal: _motionStep({
    label: "Reveal",
    description: "How an element fades in on its cue: duration and curve.",
  }),
  rise: _motionStep({
    label: "Rise",
    description:
      "Words, lines, bars, and columns rising in one after another: duration, curve, and stagger.",
  }),
  depart: _motionStep({
    label: "Depart",
    description:
      "An accelerating departure, such as a window whipped off the frame.",
  }),
  surge: _motionStep({
    label: "Surge",
    description:
      "The curve of a fly-through that lingers, surges, and settles.",
  }),
  dissolve: _motionStep({
    label: "Dissolve",
    description:
      "The curve of a dissolve between shots and of a loop fading to its ground.",
  }),
  loopFade: {
    graphic: _loopFade({
      label: "Graphic loop fade",
      description:
        "Frames a stock graphic takes to fade from and back to its ground at each end of its loop. Tempo never changes it.",
    }),
    film: _loopFade({
      label: "Film loop fade",
      description:
        "Frames a looping film takes to fade from and back to its ground. Tempo never changes it.",
    }),
  },
  pressDepth: TokenDefinitions.token({
    kind: "number",
    min: 0,
    max: 0.2,
    step: 0.005,
    label: "Press depth",
    description:
      "How far a pressed element shrinks, as a fraction of its size.",
  }),
  caret: {
    halfPeriod: TokenDefinitions.token({
      kind: "duration",
      unit: "frames",
      min: 4,
      max: 30,
      step: 1,
      label: "Caret blink",
      description: "Frames a typing caret stays on, and then off.",
    }),
  },
  easingProfile: TokenDefinitions.token({
    kind: "enum",
    options: EASING_PROFILE_OPTIONS,
    label: "Easing family",
    description:
      "Authored curves, or one family whose curve replaces the entrance, exit, travel, rise, and reveal curves.",
  }),
  easingProfiles: {
    smooth: TokenDefinitions.token({
      kind: "easing",
      label: "Smooth curve",
      description: "The curve of the smooth easing family.",
    }),
    snappy: TokenDefinitions.token({
      kind: "easing",
      label: "Snappy curve",
      description: "The curve of the snappy easing family.",
    }),
    gentle: TokenDefinitions.token({
      kind: "easing",
      label: "Gentle curve",
      description: "The curve of the gentle easing family.",
    }),
  },
  staggerScale: _multiplier({
    label: "Stagger",
    description:
      "Multiplies every stagger, so siblings arrive tighter or looser. 1 keeps them as authored.",
    max: 3,
  }),
  entranceStyle: TokenDefinitions.token({
    kind: "enum",
    options: ENTRANCE_STYLE_OPTIONS,
    label: "Entrance style",
    description:
      "What an entrance animates besides opacity: a rise, a plain fade, a scale up, or nothing, so elements appear on their cue.",
  }),
  entranceScale: TokenDefinitions.token({
    kind: "number",
    min: 0.5,
    max: 1,
    step: 0.01,
    label: "Entrance scale start",
    description:
      "The size an element starts from when the entrance style scales it up, as a fraction of its full size.",
  }),
  stagger: {
    list: _stagger({
      label: "List stagger",
      description: "Frames between siblings in a list.",
    }),
    edge: _stagger({
      label: "Edge stagger",
      description: "Frames between edges drawing in.",
    }),
    column: _stagger({
      label: "Column stagger",
      description: "Frames between neighbouring columns of a stepped wipe.",
    }),
  },
} as const;
