import { createThemeStyleFromTheme } from "../../../storyboard/StoryFilm/createThemeStyleFromTheme";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import css from "./demos.module.css";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/**
 * A shot recoloured by its own theme tokens halfway through: a dark shot
 * from the video theme's colour roles, then a light one from its slate
 * swatches. The shot draws the colours `createThemeStyleFromTheme` sets as
 * its custom properties.
 */
export function ThemeStyleDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const { semantic, atomic, mantine } = useVideoTheme();
  const themes = [
    {
      background: semantic.color.ground,
      foreground: semantic.color.text,
      brand: semantic.color.accent,
      card: semantic.color.surface,
    },
    {
      background: atomic.swatch.slate50,
      foreground: atomic.swatch.slate900,
      brand: semantic.color.highlight,
      card: mantine.white,
    },
  ];
  const shotTheme = themes[frame < 45 ? 0 : 1];
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
      <div
        className={css.themedShot}
        style={{ ...style, background: shotTheme.background }}
      >
        <span
          className={css.themedCard}
          style={{ background: shotTheme.card, color: shotTheme.foreground }}
        >
          Same scene, shot theme
        </span>
        <span
          className={css.themedAccent}
          style={{ background: shotTheme.brand }}
        />
      </div>
    </HelperDemoFrame>
  );
}
