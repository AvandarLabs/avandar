/** Kit token ← the product names that mean the same thing, best first. The
 *  `--color-` forms are Tailwind 4's `@theme` namespace. */
export const ALIASES = {
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

/** Find the first alias of a kit token that the source stylesheet defines. */
export function pick(map, kitName) {
  for (const alias of ALIASES[kitName]) {
    if (map[alias]) return { value: map[alias], from: alias };
  }
  return null;
}
