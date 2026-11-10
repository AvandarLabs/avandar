import type { ShotTheme, Theme } from "../schema/themeSchema";
import type { CSSProperties } from "react";

/**
 * Turns storyboard theme tokens into the CSS custom properties a film layer
 * sets, for example the plan theme around the whole film or one shot's field
 * colour around that shot.
 */
export function createThemeStyleFromTheme(
  theme: Theme | ShotTheme | undefined,
): CSSProperties {
  return Object.fromEntries(
    Object.entries(theme ?? {}).map(([name, value]) => [`--${name}`, value]),
  ) as CSSProperties;
}
