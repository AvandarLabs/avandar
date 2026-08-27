/**
 * Marks a spec that talks to a real third-party service over the network.
 *
 * The tag does not decide whether the spec runs. It decides what a **missing
 * credential** means, which differs by how the run was invoked:
 *
 * | Run | Tagged specs | A missing env var |
 * | --- | --- | --- |
 * | `pnpm test:e2e` | included | skipped, with the names in the reason |
 * | `pnpm test:e2e:third-party` | the only ones that run | hard failure |
 * | `pnpm test:e2e:offline` | excluded | n/a |
 *
 * The asymmetry is the point. A full run should not go red on a machine that
 * was never given the credentials, and CI holds none, so there it skips. But a
 * run invoked to exercise the third party specifically must not report green
 * having quietly skipped the one spec that touches it, because that is the same
 * green as a run that really reached the service.
 *
 * A tagged spec still has to earn its place: it is the only thing that can
 * catch a third party changing its contract, which every stubbed spec passes
 * straight through. See `docs/google-sheets-e2e.md` for that argument in full.
 */
export const E2E_THIRD_PARTY_TAG = "@third-party";

/**
 * True when the run was invoked to exercise the third-party specs.
 *
 * Set by `pnpm test:e2e:third-party` and `./scripts/runAllTests.sh
 * --third-party`. It both narrows the run to the tagged specs and makes a
 * missing credential fail rather than skip.
 */
export function isE2EThirdPartyMode(): boolean {
  return process.env.PLAYWRIGHT_E2E_THIRD_PARTY === "1";
}

/**
 * The requested variables that are unset or empty, in the order asked for.
 *
 * Empty counts as missing: that is what a workflow gives an unset secret, and
 * what an env file line with nothing after the `=` gives, and neither is a
 * usable credential.
 */
export function getMissingE2EThirdPartyEnv<Name extends string>(
  variableNames: readonly Name[],
): readonly Name[] {
  return variableNames.filter((name) => {
    return !(process.env[name] ?? "").trim();
  });
}

/**
 * The part of Playwright's `test` object this module needs.
 *
 * Taken as a parameter rather than imported, so this module stays loadable by
 * Vitest: its own unit tests pass a fake and assert both branches, and nothing
 * here has to reach into the Playwright runner.
 */
export type E2ETestSkip = Readonly<{
  skip: (condition: boolean, description: string) => void;
}>;

/**
 * Reads the credentials a third-party spec needs, or ends the test.
 *
 * Fails when the run asked for the third-party specs by name, skips otherwise.
 * See {@link E2E_THIRD_PARTY_TAG} for why those are different.
 *
 * @param options.test The spec's `test` object, used to skip.
 * @param options.variableNames Env var names the spec cannot run without.
 * @returns Each requested name mapped to its value, when all are present.
 */
export function requireE2EThirdPartyEnv<Name extends string>(
  options: Readonly<{ test: E2ETestSkip; variableNames: readonly Name[] }>,
): Record<Name, string> {
  const { test, variableNames } = options;
  const missing = getMissingE2EThirdPartyEnv(variableNames);

  if (missing.length > 0) {
    const names = missing.join(", ");
    const isOrAre = missing.length > 1 ? "are" : "is";
    if (isE2EThirdPartyMode()) {
      throw new Error(
        `This run asked for the third-party specs but ${names} ${isOrAre} ` +
          "not set. Set them in `.env.development` or the environment, or run " +
          "`pnpm test:e2e`, where a spec missing its credentials skips.",
      );
    }
    test.skip(true, `Set ${names} to run this against the real service.`);

    // Playwright's `test.skip(true, …)` aborts the test by throwing, so this
    // is unreachable in a real run. It is here so a `test` that does not abort
    // cannot fall through and read the credentials that are missing.
    throw new Error(`Skipped: ${names} ${isOrAre} not set.`);
  }

  return Object.fromEntries(
    variableNames.map((name) => {
      return [name, (process.env[name] ?? "").trim()];
    }),
  ) as Record<Name, string>;
}
