/*
 * Translated names the editor shows that are not catalog copy: section
 * names, composite field names, and enum options.
 */
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";

/** Readable words for a component name, such as `Progress bar` for `ProgressBar`. */
function _humanize(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Section names for semantic and Mantine groups. Atomic groups use their scale's catalog label. */
export function useGroupCopy(): (group: string) => string | undefined {
  const { t } = useLingui();
  return useMemo(() => {
    const names: Readonly<Record<string, string>> = {
      "semantic:color": t`Colour`,
      "semantic:text": t`Type`,
      "semantic:stroke": t`Strokes`,
      "semantic:corner": t`Corners`,
      "semantic:elevation": t`Elevation`,
      "semantic:effect": t`Effects`,
      "semantic:sketch": t`Sketch`,
      "semantic:layout": t`Layout`,
      "semantic:motion": t`Motion`,
      "semantic:camera": t`Camera`,
      "semantic:motionBlur": t`Motion blur`,
      "mantine:palette": t`Palettes`,
      "mantine:type": t`Type scale`,
      "mantine:dimension": t`Radii and spacing`,
      "mantine:rendering": t`Rendering`,
    };
    return (group: string) => {
      const [tier, name] = group.split(":");
      return tier === "component" ? _humanize(name) : names[group];
    };
  }, [t]);
}

/** Names of type style fields. */
function useTypeFieldCopy(): Readonly<Record<string, string>> {
  const { t } = useLingui();
  return useMemo(
    () => ({
      family: t`Font`,
      size: t`Size`,
      weight: t`Weight`,
      lineHeight: t`Line height`,
      letterSpacing: t`Letter spacing`,
      transform: t`Letter case`,
      numeric: t`Numerals`,
      color: t`Colour`,
      alpha: t`Opacity`,
      textShadow: t`Text shadow`,
      glow: t`Glow`,
      stroke: t`Outline`,
    }),
    [t],
  );
}

/** Names of every composite field, for labels such as "Size" or "Curve". */
export function useFieldCopy(): (field: string) => string {
  const { t } = useLingui();
  const typeFields = useTypeFieldCopy();
  return useMemo(() => {
    const names: Readonly<Record<string, string>> = {
      ...typeFields,
      shadow: t`Shadow`,
      roughness: t`Roughness`,
      bowing: t`Bowing`,
      seed: t`Seed`,
      randomness: t`Offset`,
      top: t`Top`,
      right: t`Right`,
      bottom: t`Bottom`,
      left: t`Left`,
      x: t`Horizontal`,
      y: t`Vertical`,
      gap: t`Gap`,
      duration: t`Duration`,
      easing: t`Curve`,
      distance: t`Distance`,
      spring: t`Spring`,
      period: t`Cycle`,
      rate: t`Rate`,
      speed: t`Speed`,
      shutter: t`Shutter angle`,
      min: t`Minimum`,
      max: t`Maximum`,
      onDark: t`On dark backgrounds`,
      onLight: t`On light backgrounds`,
    };
    return (field: string) => names[field] ?? field;
  }, [t, typeFields]);
}

/** One enum option's name and, for camera presets, what it feels like. */
export type OptionCopy = Readonly<{ label: string; description?: string }>;

/** Camera preset names and the editorial intent of each. */
function useCameraPresetCopy(): Readonly<Record<string, OptionCopy>> {
  const { t } = useLingui();
  return useMemo(
    () => ({
      authored: {
        label: t`Composition default`,
        description: t`Keeps the speed, easing, and blur defined in each scene.`,
      },
      deliberate: {
        label: t`Deliberate`,
        description: t`Patient and investigative. Gives viewers time to inspect an unfamiliar system or a dense diagram.`,
      },
      gentle: {
        label: t`Gentle`,
        description: t`Calm and instructional. A gradual change of focus for tutorials and teaching.`,
      },
      balanced: {
        label: t`Balanced`,
        description: t`Measured and readable. Connects related ideas without drawing attention away from the explanation.`,
      },
      brisk: {
        label: t`Brisk`,
        description: t`Confident and purposeful. Moves promptly between familiar landmarks, with a more emphatic start and stop.`,
      },
      whip: {
        label: t`Whip`,
        description: t`Fast and energetic. Adds a brief burst of momentum at a major subject change. Use it sparingly.`,
      },
    }),
    [t],
  );
}

/** Names for enum options by token path or composite field name. */
export function useOptionCopy(): (key: string, option: string) => OptionCopy {
  const { t } = useLingui();
  const cameraPresets = useCameraPresetCopy();
  return useMemo(() => {
    const options: Readonly<
      Record<string, Readonly<Record<string, OptionCopy>>>
    > = {
      "camera.preset": cameraPresets,
      transform: {
        none: { label: t`As written` },
        uppercase: { label: t`Uppercase` },
        lowercase: { label: t`Lowercase` },
        capitalize: { label: t`Capitalized` },
      },
      numeric: {
        normal: { label: t`Proportional` },
        "tabular-nums": { label: t`Tabular` },
      },
      primaryColor: {
        primary: { label: t`Primary` },
        neutral: { label: t`Neutral` },
        secondary: { label: t`Secondary` },
        success: { label: t`Success` },
        warning: { label: t`Warning` },
        danger: { label: t`Danger` },
        info: { label: t`Info` },
      },
    };
    return (key: string, option: string) =>
      options[key]?.[option] ?? { label: option };
  }, [t, cameraPresets]);
}
