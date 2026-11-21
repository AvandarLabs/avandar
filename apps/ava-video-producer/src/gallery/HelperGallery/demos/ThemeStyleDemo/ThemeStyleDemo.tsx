import { makeThemeStyleFromTheme } from "../../../../storyboard/StoryFilm/makeThemeStyleFromTheme";
import { useVideoTheme } from "../../../../videoTheme/videoThemeHelpers";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import css from "./ThemeStyleDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

type Props = HelperDemoProps;

/** The dark shot theme from colour roles, then the light one from swatches. */
function useDemoShotThemes() {
  const { semantic, atomic, mantine } = useVideoTheme();
  return [
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
}

/**
 * A shot recoloured by its own theme tokens halfway through: a dark shot
 * from the video theme's colour roles, then a light one from its slate
 * swatches. The shot draws the colours `makeThemeStyleFromTheme` sets as
 * its custom properties.
 */
export function ThemeStyleDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const themes = useDemoShotThemes();
  const shotTheme = themes[frame < 45 ? 0 : 1];
  const style = makeThemeStyleFromTheme(shotTheme);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="makeThemeStyleFromTheme(shot.theme)"
      readouts={Object.entries(style)
        .slice(0, 3)
        .map(([name, value]) => {
          return { name, value: String(value) };
        })}
    >
      <div
        className={css.themeStyleDemoThemedShot}
        style={{ ...style, background: shotTheme.background }}
      >
        <span
          className={css.themeStyleDemoThemedCard}
          style={{ background: shotTheme.card, color: shotTheme.foreground }}
        >
          Same scene, shot theme
        </span>
        <span
          className={css.themeStyleDemoThemedAccent}
          style={{ background: shotTheme.brand }}
        />
      </div>
    </HelperDemoFrame>
  );
}
