import { TokenDefinitions } from "../TokenDefinitions";

function _cameraPreset(name: string) {
  return TokenDefinitions.token({
    kind: "cameraPreset",
    label: `${name} camera`,
    description: `Speed, shutter, and curve of the ${name.toLowerCase()} camera preset.`,
  });
}
function _easing({
  label,
  description,
}: Readonly<{
  label: string;
  description: string;
}>) {
  return TokenDefinitions.token({ kind: "easing", label, description });
}
const CAMERA_PRESET_OPTIONS = [
  "authored",
  "deliberate",
  "gentle",
  "balanced",
  "brisk",
  "whip",
] as const;
/** Semantic camera presets, curves, and zoom limits. */
export const CAMERA_TOKENS = {
  preset: TokenDefinitions.token({
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
    push: _easing({
      label: "Push curve",
      description: "The curve of a camera pushing in.",
    }),
    whip: _easing({
      label: "Whip curve",
      description: "The curve of a fast camera whip.",
    }),
    glide: _easing({
      label: "Glide curve",
      description: "The curve of a camera gliding between framings.",
    }),
  },
  zoom: TokenDefinitions.token({
    kind: "range",
    label: "Zoom limits",
    description: "The smallest and largest camera zoom.",
  }),
} as const;
