import { z } from "zod";

/**
 * The CSS custom properties a storyboard may set, without the leading `--`.
 * Scenes read only these names, so a plan or a shot can recolour a film
 * without touching scene code. `shadow` is the colour of a cast shadow, for
 * example under a tilted window.
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

const COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([\d.,%\s/+-]+\))$/;
const TOKEN_REFERENCE_PATTERN = new RegExp(
  `^var\\(--(${THEME_TOKEN_NAMES.join("|")})\\)$`,
);
const colorSchema = z.string().max(100).regex(COLOR_PATTERN);

/**
 * Plan-wide colour tokens, applied once around the whole film. Values are
 * literal colours such as the product's adopted palette.
 */
export const themeSchema = z
  .object(
    Object.fromEntries(
      THEME_TOKEN_NAMES.map((name) => [name, colorSchema.optional()]),
    ) as Record<ThemeTokenName, z.ZodOptional<typeof colorSchema>>,
  )
  .strict();

const shotTokenSchema = z
  .string()
  .max(100)
  .refine(
    (value) => COLOR_PATTERN.test(value) || TOKEN_REFERENCE_PATTERN.test(value),
    "Use a colour or var(--token) naming another storyboard token",
  );

/**
 * Per-shot colour overrides layered over the plan theme, so one film can cut
 * between field colours (a dark field, an accent field, a light field). A
 * value may be a colour or `var(--token)` naming another token, for example
 * `ground: "var(--brand)"` to paint the shot on the plan's accent.
 */
export const shotThemeSchema = z
  .object(
    Object.fromEntries(
      THEME_TOKEN_NAMES.map((name) => [name, shotTokenSchema.optional()]),
    ) as Record<ThemeTokenName, z.ZodOptional<typeof shotTokenSchema>>,
  )
  .strict()
  .superRefine((theme, context) => {
    Object.entries(theme).forEach(([name, value]) => {
      if (value === `var(--${name})`) {
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
