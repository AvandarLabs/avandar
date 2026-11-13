import { token } from "./defineTokens";

/**
 * Component tokens: `components.<Name>.defaultProps` in a theme, read by
 * themed shapes through Mantine `useProps` (via `useVideoProps`). A value is
 * a reference or a deliberate literal one-off. Plan 2 adds one entry per
 * themed shape as each renderer adopts tokens.
 */
export const COMPONENT_TOKENS = {
  ProgressBar: {
    height: token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 1,
      max: 16,
      step: 1,
      label: "Progress bar height",
      description: "Thickness of the beat progress bar along the bottom of the stage.",
    }),
    paint: token({
      kind: "paint",
      surface: "stage",
      label: "Progress bar colour",
      description: "Colour and opacity of the beat progress bar.",
    }),
  },
} as const;
