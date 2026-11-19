import { z } from "zod";

/**
 * The scene palette names a storyboard theme may set: each is a
 * `color.scene.*` token, `muted-foreground` for `color.scene.mutedForeground`
 * and so on. Scenes read only the scene palette, so a plan or a shot can
 * recolour a film without touching scene code. `shadow` is the colour of a
 * cast shadow, for example under a tilted window.
 */
export const THEME_TOKEN_NAMES = [
  "background",
  "foreground",
  "card",
  "muted",
  "muted-foreground",
  "border",
  "brand",
  "brand-soft",
  "brand-strong",
  "ground",
  "shadow",
] as const;

/** One storyboard theme token name. */
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
/**
 * A theme colour a storyboard may name instead of a hex: a scene palette or
 * colour role (`$color.scene.foreground`), an atomic swatch
 * (`$atomic.swatch.slate900`), a Mantine palette shade (`$colors.primary.6`),
 * `$primary`, `$white`, or `$black`.
 */
const THEME_COLOR_REFERENCE_PATTERN =
  /^\$(?:color\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)?|atomic\.swatch\.[A-Za-z0-9]+|colors\.[A-Za-z0-9]+\.\d|primary|white|black)$/;
const NAME_REFERENCE_PATTERN = new RegExp(
  `^var\\(--(${THEME_TOKEN_NAMES.join("|")})\\)$`,
);
const COLOR_MESSAGE =
  "Use a hex colour or a theme colour reference such as $atomic.swatch.slate900";
const colorSchema = z
  .string()
  .max(100)
  .refine((value) => {
    return COLOR_PATTERN.test(value) || THEME_COLOR_REFERENCE_PATTERN.test(value);
  }, COLOR_MESSAGE);

/**
 * Plan-wide colour tokens, applied once around the whole film over the
 * theme's scene palette. A value is a hex colour or a theme colour
 * reference, so a plan can follow the theme instead of fixing a colour.
 */
export const themeSchema = z.strictObject(
  Object.fromEntries(
    THEME_TOKEN_NAMES.map((name) => {
      return [name, colorSchema.optional()];
    }),
  ) as Record<ThemeTokenName, z.ZodOptional<typeof colorSchema>>,
);

const shotTokenSchema = z
  .string()
  .max(100)
  .refine((value) => {
    return (
      COLOR_PATTERN.test(value) ||
      THEME_COLOR_REFERENCE_PATTERN.test(value) ||
      NAME_REFERENCE_PATTERN.test(value)
    );
  }, `${COLOR_MESSAGE}, or var(--token) naming another storyboard token`);

/** `muted-foreground` as its scene palette key, `mutedForeground`. */
function _sceneKeyFromName(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  });
}

/**
 * Per-shot colour overrides layered over the plan theme, so one film can cut
 * between field colours (a dark field, an accent field, a light field). A
 * value may be a hex colour, a theme colour reference such as
 * `$atomic.swatch.slate50`, or `var(--token)` naming another token, for
 * example `ground: "var(--brand)"` to paint the shot on the plan's accent.
 */
export const shotThemeSchema = z
  .strictObject(
    Object.fromEntries(
      THEME_TOKEN_NAMES.map((name) => {
        return [name, shotTokenSchema.optional()];
      }),
    ) as Record<ThemeTokenName, z.ZodOptional<typeof shotTokenSchema>>,
  )
  .superRefine((theme, context) => {
    Object.entries(theme).forEach(([name, value]) => {
      if (
        value === `var(--${name})` ||
        value === `$color.scene.${_sceneKeyFromName(name)}`
      ) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: `--${name} cannot reference itself`,
        });
      }
    });
  });

/** Plan-wide storyboard theme tokens. */
export type Theme = z.infer<typeof themeSchema>;

/** Per-shot storyboard theme overrides. */
export type ShotTheme = z.infer<typeof shotThemeSchema>;
