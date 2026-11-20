import type { VideoThemePatch } from "../../../videoTheme/videoTheme.types";
import type { ShotTheme, Theme } from "../../schema/themeSchema";

const NAME_REFERENCE_PATTERN = /^var\(--([a-z-]+)\)$/;

/** `muted-foreground` to `mutedForeground`, the scene palette token key. */
function _tokenKeyFromName(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  });
}

/**
 * A storyboard value as a scene palette value: `var(--brand)` becomes the
 * reference `$color.scene.brand`; a hex or another reference is kept.
 */
function _tokenValueFromThemeValue(value: string): string {
  const match = NAME_REFERENCE_PATTERN.exec(value);
  return match ? `$color.scene.${_tokenKeyFromName(match[1])}` : value;
}

/**
 * A storyboard plan or shot theme as video theme patches over the scene
 * palette (`color.scene.*`), for `VideoThemeScope` around the film or the
 * shot. The shot's patch layers over the plan's, so `var(--brand)` in a shot
 * reads the plan's brand unless the shot sets its own. A missing or empty
 * theme adds no patch.
 */
export function makeThemePatchesFromTheme(
  theme: Theme | ShotTheme | undefined,
): VideoThemePatch[] {
  const entries = Object.entries(theme ?? {}).flatMap(([name, value]) => {
    return value === undefined
      ? []
      : [[_tokenKeyFromName(name), _tokenValueFromThemeValue(value)]];
  });
  if (entries.length === 0) {
    return [];
  }
  return [
    {
      other: {
        video: { semantic: { color: { scene: Object.fromEntries(entries) } } },
      },
    },
  ];
}
