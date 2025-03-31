/**
 * Returns a string that references a CSS variable (custom property).
 * @example cssVar('mantine-primary-color-6') // "var(--mantine-primary-color-6)"
 * @param {string} name - The name of the CSS variable.
 * @returns {string} The CSS var string that references the CSS variable.
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}
