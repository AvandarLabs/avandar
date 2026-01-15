/**
 * Returns a validator function that validates if a string is PascalCase.
 *
 * This function should be used in an Acclimate param's `validator` option.
 *
 * @param errorMessage - Error message to return if the value is not PascalCase.
 *
 * @returns An Acclimate validator function.
 */
export function isPascalCase(
  errorMessage?: string,
): (value: string) => boolean | string {
  return (value: string) => {
    const isValid = /^[A-Z][A-Za-z0-9]*$/.test(value);
    if (isValid) {
      return true;
    }
    return errorMessage ?? "Value must be PascalCase.";
  };
}
