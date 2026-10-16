import { NEUTRAL_SHADES } from "../../../shared/config/Theme.ts";
import { ElevationTheme } from "../../../src/config/Theme/ElevationTheme.ts";
import { Theme } from "../../../src/config/Theme/Theme.ts";
import { requireLicense } from "./require-license.mjs";

requireLicense();

// Export only palette values, without bundling the product's runtime into the gallery.
process.stdout.write(
  JSON.stringify({
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
  }),
);
