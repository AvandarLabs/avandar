import { createThemeStyleFromTheme } from "../../../storyboard/StoryFilm/createThemeStyleFromTheme";
import theme from "../../theme-colors.json";
import css from "./demos.module.css";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";

/** Two shot themes from Avandar's dark and light surfaces. */
const THEMES = [
  {
    background: theme.surfaces.dark.body,
    foreground: theme.neutral[0],
    brand: theme.primary[4],
    card: theme.surfaces.dark.raised,
  },
  {
    background: theme.surfaces.light.body,
    foreground: theme.neutral[9],
    brand: theme.secondary[6],
    card: theme.surfaces.light.raised,
  },
];

/** A shot recoloured by its own theme tokens halfway through. */
export function ThemeStyleDemo({ frame, frames }: HelperDemoProps) {
  const shotTheme = THEMES[frame < 45 ? 0 : 1];
  const style = createThemeStyleFromTheme(shotTheme);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="createThemeStyleFromTheme(shot.theme)"
      readouts={Object.entries(style)
        .slice(0, 3)
        .map(([name, value]) => {
          return { name, value: String(value) };
        })}
    >
      <div className={css.themedShot} style={style}>
        <span className={css.themedCard}>Same scene, shot theme</span>
        <span className={css.themedAccent} />
      </div>
    </HelperDemoFrame>
  );
}
