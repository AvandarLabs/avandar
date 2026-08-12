/**
 * The version of `@avandar/ava-cli` that the running bundle was built from.
 *
 * tsup replaces `__AVA_CLI_VERSION__` with a literal at build time (see
 * `tsup.config.ts`), so the value travels inside `dist/main.cjs` and cannot
 * drift from it. Comparing it against the version in
 * `apps/ava-cli/package.json` on disk is therefore a comparison between what is
 * running and what the repository currently describes.
 *
 * The identifier does not exist when the source is executed directly, as in
 * tests, so it is read through a `typeof` guard and reported as unknown.
 */
declare const __AVA_CLI_VERSION__: string;

export function getBuiltCLIVersion(): string | undefined {
  return typeof __AVA_CLI_VERSION__ === "string" ? __AVA_CLI_VERSION__ : (
      undefined
    );
}
