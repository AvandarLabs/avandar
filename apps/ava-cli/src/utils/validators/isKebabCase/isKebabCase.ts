/**
 * Returns a validator function that validates if a string
 * is kebab-case.
 *
 * This function should be used in an Acclimate param's
 * `validator` option.
 *
 * @param errorMessage - Error message to return if the
 * value is not kebab-case.
 *
 * @returns An Acclimate validator function.
 */
export function isKebabCase(
  errorMessage?: string,
): (value: string) => boolean | string {
  return (value: string) => {
    const isValid = /^[a-z][a-z0-9-]*$/.test(value);
    if (isValid) {
      return true;
    }
    return errorMessage ?? "Value must be kebab-case.";
  };
}
