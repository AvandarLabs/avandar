/**
 * Returns a string that references a CSS variable (custom property).
 *
 * Example:
 * `cssVar('mantine-primary-color-6')` returns
 * `"var(--mantine-primary-color-6)"`
 *
 * @param {string} name - The name of the CSS variable.
 * @returns {string} The CSS var string that references the CSS variable.
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}
