import { STOCK } from "../stock/graphics-common";
import theme from "./theme-colors.json";

/** Curated swatches read from the current Avandar theme at gallery build time. */
export const ACCENT_SWATCHES = [
  {
    name: "Avandar blue",
    color: theme.brand,
    token: "primary[6], official brand",
  },
  { name: "Sky blue", color: theme.primary[4], token: "primary[4]" },
  { name: "Deep blue", color: theme.primary[8], token: "primary[8]" },
  { name: "Amber", color: theme.secondary[6], token: "secondary[6]" },
  { name: "Green", color: theme.success[6], token: "success[6]" },
  { name: "Yellow", color: theme.warning[6], token: "warning[6]" },
  { name: "Red", color: theme.danger[6], token: "danger[6]" },
  { name: "Cyan", color: theme.info[6], token: "info[6]" },
  { name: "Original mint", color: STOCK.mint, token: "Original stock palette" },
] as const;

/** Theme surfaces and a pale brand tint, plus the original stock background. */
export const BACKGROUND_SWATCHES = [
  {
    name: "Original dark",
    color: STOCK.ground,
    token: "Original stock palette",
  },
  {
    name: "Dark body",
    color: theme.surfaces.dark.body,
    token: "surfaces.dark.body / neutral[9]",
  },
  {
    name: "Dark raised",
    color: theme.surfaces.dark.raised,
    token: "surfaces.dark.raised / neutral[8]",
  },
  {
    name: "Shell",
    color: theme.shell,
    token: "navbar.backgroundColor / neutral[6]",
  },
  {
    name: "Light body",
    color: theme.surfaces.light.body,
    token: "surfaces.light.body / neutral[0]",
  },
  {
    name: "Light sunken",
    color: theme.surfaces.light.sunken,
    token: "surfaces.light.sunken / neutral[1]",
  },
  {
    name: "White",
    color: theme.surfaces.light.raised,
    token: "surfaces.light.raised",
  },
  {
    name: "Blue wash",
    color: theme.primary[0],
    token: "primary[0], preview background option",
  },
] as const;

/** Atlas defaults are independent of the stock renderer and its existing exports. */
export const DEFAULT_ACCENT = theme.primary[4];
export const DEFAULT_BACKGROUND = STOCK.ground;
