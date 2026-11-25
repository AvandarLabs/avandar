import type { AliasHit, Palette } from "./adoptTheme.types";
/**
 * Kit token, then the product names that mean the same thing, best first.
 * The `--color-` forms are Tailwind 4's `@theme` namespace.
 */
export const ALIASES: Readonly<Record<string, readonly string[]>> = {
  "--background": ["--background", "--color-background", "--bg", "--page"],
  "--foreground": ["--foreground", "--color-foreground", "--text", "--fg"],
  "--card": ["--card", "--color-card", "--surface", "--panel", "--popover"],
  "--muted": ["--muted", "--color-muted", "--subtle", "--secondary"],
  "--muted-foreground": [
    "--muted-foreground",
    "--color-muted-foreground",
    "--text-muted",
    "--secondary-foreground",
  ],
  "--border": ["--border", "--color-border", "--line", "--outline"],
  "--brand": [
    "--primary",
    "--brand",
    "--accent",
    "--color-primary",
    "--color-brand",
    "--color-accent",
  ],
  "--brand-soft": ["--primary-soft", "--brand-soft", "--accent-soft"],
  "--brand-strong": ["--primary-strong", "--brand-strong", "--accent-strong"],
  "--ground": ["--poster", "--ground", "--backdrop", "--stage"],
  "--radius": ["--radius", "--radius-lg", "--rounded"],
};
/**
 * The value and source name of the first alias of a kit token that the
 * product palette defines, or undefined. `makeKitTokensFromPalette` uses it to
 * map each kit token onto the product's own names.
 */
export function getAliasValueFromPalette({
  palette,
  kitToken,
}: Readonly<{
  palette: Readonly<Palette>;
  kitToken: string;
}>): AliasHit | undefined {
  const alias = (ALIASES[kitToken] ?? []).find((name) => {
    return palette[name];
  });
  return alias ? { value: palette[alias], from: alias } : undefined;
}
