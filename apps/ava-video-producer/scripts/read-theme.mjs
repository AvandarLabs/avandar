import { NEUTRAL_SHADES } from "../../../shared/config/Theme.ts";
import {
  AnimationTheme,
  BorderTheme,
  ElevationTheme,
  OverlayTheme,
  Theme,
} from "../../../src/config/Theme/Theme.ts";
import { requireLicense } from "./require-license.mjs";

requireLicense();

// Export only palette values, without bundling the product's runtime into the gallery.
const palette = {
  primary: Theme.colors.primary,
  neutral: NEUTRAL_SHADES,
  secondary: Theme.colors.secondary,
  success: Theme.colors.success,
  warning: Theme.colors.warning,
  danger: Theme.colors.danger,
  info: Theme.colors.info,
  brand: Theme.other.primaryColor,
  shell: Theme.other.navbar.backgroundColor,
  surfaces: ElevationTheme.surfaces,
};

// `--for-video` adds the values `theme:sync-avandar` maps into avandar.theme.json.
process.stdout.write(
  JSON.stringify(
    process.argv.includes("--for-video")
      ? {
          ...palette,
          radius: BorderTheme.radius,
          borders: BorderTheme.colors,
          shadows: ElevationTheme.shadows,
          easing: AnimationTheme.easing,
          overlay: OverlayTheme.backdrop,
          fontFamily: Theme.fontFamily,
        }
      : palette,
  ),
);
