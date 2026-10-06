// tsup replaces this identifier with a literal at build time; see
// tsup.config.ts. It does not exist when the source runs directly, as in tests,
// hence the `typeof` guard below.
declare const __AVA_CLI_VERSION__: string;

/**
 * The version of `@avandar/ava-cli` that the running bundle was built from, or
 * `undefined` when the source is running directly rather than from a bundle.
 *
 * The value travels inside `dist/main.cjs`, so it cannot drift from the bundle.
 * Comparing it against the version in `apps/ava-cli/package.json` on disk is
 * therefore a comparison between what is running and what the repository
 * currently describes.
 */
export function getBuiltCliVersion(): string | undefined {
  return typeof __AVA_CLI_VERSION__ === "string"
    ? __AVA_CLI_VERSION__
    : undefined;
}
