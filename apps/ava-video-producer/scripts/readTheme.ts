import { NEUTRAL_SHADES } from "../../../shared/config/Theme";
import {
  AnimationTheme,
  BorderTheme,
  ElevationTheme,
  OverlayTheme,
  Theme,
} from "../../../src/config/Theme/Theme";
import { requireLicense } from "./requireLicense";

// Prints the workspace Avandar theme's palette as JSON, read straight from
// product source. `refreshPalette` reads it for the showcase, and
// `theme:sync-avandar` reads the `--for-video` form.
// Usage: node --import tsx scripts/readTheme.ts [--for-video]

requireLicense();

// Export only palette values, without bundling the product's runtime into the gallery.
const palette = {
  primary: Theme.colors?.primary,
  neutral: NEUTRAL_SHADES,
  secondary: Theme.colors?.secondary,
  success: Theme.colors?.success,
  warning: Theme.colors?.warning,
  danger: Theme.colors?.danger,
  info: Theme.colors?.info,
  brand: Theme.other?.primaryColor,
  shell: Theme.other?.navbar.backgroundColor,
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
