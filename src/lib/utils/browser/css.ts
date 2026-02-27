/**
 * Returns a string that references a CSS variable (custom property).
 *
 * @example
 * cssVar('mantine-primary-color-6') // "var(--mantine-primary-color-6)"
 *
 * @param {string} name - The name of the CSS variable.
 * @returns {string} The CSS var string that references the CSS variable.
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Returns a string that references a Mantine color variable.
 *
 * @example
 * mantineColorVar('primary.8'); // "var(--mantine-color-primary-8)"
 * @example
 * // no shade specified defaults to 6
 * mantineColorVar('neutral'); // "var(--mantine-color-neutral-6)"
 *
 * @param {string} color - The theme color to reference.
 * @returns {string} The Mantine color var string that references the color.
 */
export function mantineColorVar(color: `${string}.${number}` | string): string {
  if (color.includes(".")) {
    const [colorName, shade] = color.split(".");
    return `var(--mantine-color-${colorName}-${shade})`;
  }
  return `var(--mantine-color-${color}-6)`;
}

/**
 * Returns a string that references a Mantine color variable.
 *
 * @example
 * mantineVar('shadow-lg'); // "var(--mantine-shadow-lg)"
 *
 * @param {string} name - The base variable name to use
 * @returns {string} The full Mantine var string
 */
export function mantineVar(name: string): string {
  return `var(--mantine-${name})`;
}
