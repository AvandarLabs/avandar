import { token } from "../defineTokensHelpers";
import {
  createAlphaToken,
  createColorToken,
  createEasingToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

function _degrees({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "number",
    surface: "stage",
    unit: "deg",
    min: -90,
    max: 90,
    step: 0.5,
    label,
    description,
  });
}
function _perspective({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "number",
    surface: "stage",
    unit: "px",
    min: 400,
    max: 6000,
    step: 50,
    label,
    description,
  });
}
function _blur({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "length",
    surface: "stage",
    unit: "px",
    min: 0,
    max: 48,
    step: 0.5,
    label,
    description,
  });
}
function _fraction({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "number",
    surface: "stage",
    min: 0,
    max: 1,
    step: 0.005,
    label,
    description,
  });
}
/**
 * Tokens of the scene studies, the title card, and the app chrome: the
 * tilted window's plane and motion, the brand lockup's flight, the cursor,
 * and the product orb.
 */
export const SCENE_COMPONENT_TOKENS = {
  WindowTilt: {
    perspective: _perspective({
      label: "Window perspective",
      description: "Perspective distance of a single tilted window.",
    }),
    rotateY: _degrees({
      label: "Window turn",
      description:
        "How far a tilted window turns. Negative brings its right edge toward the camera.",
    }),
    rotateX: _degrees({
      label: "Window lean",
      description: "How far a tilted window leans back.",
    }),
    rotateZ: _degrees({
      label: "Window roll",
      description: "How far a tilted window rolls.",
    }),
    entryRotateY: _degrees({
      label: "Window entry turn",
      description: "The steeper turn a window enters at before it settles.",
    }),
    pairPerspective: _perspective({
      label: "Pair perspective",
      description: "Perspective distance of the two windows in a pair.",
    }),
    pairRotateY: _degrees({
      label: "Pair turn",
      description:
        "How far the left window of a pair turns. The right one mirrors it.",
    }),
    pairRotateX: _degrees({
      label: "Pair lean",
      description: "How far the windows of a pair lean back.",
    }),
    flipPerspective: _perspective({
      label: "Flip perspective",
      description:
        "The longer lens of a joined card flipping in, so its near edge stays inside the frame.",
    }),
    flipStartRotateY: _degrees({
      label: "Flip start turn",
      description:
        "The nearly edge-on turn a joined card starts its flip from.",
    }),
    chromeRadius: createLengthToken(
      "Window corner",
      "Corner radius of a tilted window's chrome.",
      "stage",
    ),
    titlebarHeight: _fraction({
      label: "Titlebar height",
      description:
        "Height of a tilted window's titlebar, as a fraction of the canvas height.",
    }),
  },
  WindowMotion: {
    whipBlur: _blur({
      label: "Whip blur",
      description: "Peak horizontal blur of a window whipping in or out.",
    }),
    slideBlur: _blur({
      label: "Slide blur",
      description: "Peak horizontal blur of a carousel slide.",
    }),
    cameraBlur: _blur({
      label: "Camera blur",
      description: "The most blur a camera move adds to a window.",
    }),
    slideHold: _fraction({
      label: "Slide hold",
      description:
        "Share of a carousel slide the outgoing window stays opaque for.",
    }),
  },
  BrandLockup: {
    flightTilt: token({
      kind: "number",
      surface: "stage",
      unit: "deg",
      min: 0,
      max: 60,
      step: 0.5,
      label: "Flight tilt",
      description:
        "Largest rotation of the flying columns, at the middle of a fly-through.",
    }),
    columnStagger: token({
      kind: "number",
      surface: "stage",
      unit: "frames",
      min: 0,
      max: 6,
      step: 0.5,
      label: "Mark column stagger",
      description: "Frames between neighbouring columns of a mark rising in.",
    }),
    flightPerspective: _perspective({
      label: "Flight perspective",
      description:
        "Perspective distance of a fly-through. Smaller values exaggerate the depth.",
    }),
  },
  Cursor: {
    scale: token({
      kind: "number",
      surface: "stage",
      unit: "×",
      min: 0.5,
      max: 3,
      step: 0.05,
      label: "Cursor size",
      description:
        "How large the pointer draws. Measured hotspots scale with it.",
    }),
    pressDepth: token({
      kind: "number",
      surface: "stage",
      min: 0,
      max: 0.2,
      step: 0.005,
      label: "Cursor press depth",
      description: "How far the pointer shrinks on a click.",
    }),
    trailAlpha: createAlphaToken(
      "Cursor trail",
      "Opacity of each motion-blur sample trailing a moving pointer.",
      "stage",
    ),
    trailLimit: createLengthToken(
      "Cursor trail length",
      "The farthest a trailing sample may sit behind the pointer.",
      "stage",
    ),
    shadow: token({
      kind: "elevation",
      surface: "stage",
      label: "Cursor shadow",
      description: "The drop shadow under the pointer.",
    }),
    travelEasing: createEasingToken(
      "Cursor travel curve",
      "How the pointer accelerates and settles between two positions.",
      "stage",
    ),
  },
  Orb: {
    ringWidth: createStrokeToken(
      "Orb ring",
      "Width of the soft ring around the product orb.",
      "stage",
    ),
    ringColor: createColorToken(
      "Orb ring colour",
      "Colour of the soft ring around the product orb.",
      "stage",
    ),
  },
} as const;
