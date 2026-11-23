/**
 * Reads an optional environment variable, such as an API key a pipeline can
 * run without.
 *
 * @param name - The variable's name.
 * @returns The trimmed value, or `undefined` when unset or blank.
 */
export function getOptionalEnvVar(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}
