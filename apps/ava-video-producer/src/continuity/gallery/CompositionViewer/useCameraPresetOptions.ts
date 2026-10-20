import { useLingui } from "@lingui/react/macro";
import { MOTION_PRESETS } from "../../../motion-components/motionSettings";

/** Translated camera settings and the editorial intent of each travel profile. */
export function useCameraPresetOptions() {
  const { t } = useLingui();
  const profiles = {
    deliberate: {
      label: t`Deliberate`,
      feel: t`Patient and investigative. Gives viewers time to inspect an unfamiliar system or a dense diagram.`,
    },
    gentle: {
      label: t`Gentle`,
      feel: t`Calm and instructional. A gradual change of focus for tutorials and teaching.`,
    },
    balanced: {
      label: t`Balanced`,
      feel: t`Measured and readable. Connects related ideas without drawing attention away from the explanation.`,
    },
    brisk: {
      label: t`Brisk`,
      feel: t`Confident and purposeful. Moves promptly between familiar landmarks, with a more emphatic start and stop.`,
    },
    whip: {
      label: t`Whip`,
      feel: t`Fast and energetic. Adds a brief burst of momentum at a major subject change. Best used sparingly, with a clear destination.`,
    },
  };
  return [
    {
      value: "authored",
      label: t`Composition default`,
      details: t`Keeps the speed, easing, and blur already defined in each scene. There is no fixed speed multiplier: the composition may use different settings along its route. Preserves its original pacing and feel.`,
    },
    ...Object.entries(profiles).map(([value, profile]) => {
      const { speed, shutterAngle, easing } =
        MOTION_PRESETS[value as keyof typeof MOTION_PRESETS];
      const settings = t`Camera travel speed: ${speed}×. Easing: ${easing}. Blur shutter angle: ${shutterAngle}°. Blur strength: 1; temporal samples: 10.`;
      const timing = t`Only camera travel changes. Reading holds stay intact; slower moves may extend the scene. The Motion blur toggle can turn blur off.`;
      return {
        value,
        label: profile.label,
        details: `${profile.feel}\n\n${settings}\n\n${timing}`,
      };
    }),
  ];
}
