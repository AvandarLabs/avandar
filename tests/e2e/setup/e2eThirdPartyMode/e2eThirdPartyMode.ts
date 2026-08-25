/**
 * Marks a spec that talks to a real third-party service over the network.
 *
 * Excluded by default, and included only by `pnpm test:e2e:third-party`. The
 * exclusion is by tag rather than by whether the credentials happen to be set,
 * because those are different guarantees: an env-shaped gate silently starts
 * running live specs the moment someone adds the secrets to a job's `env:`,
 * which is exactly how a blocking PR gate acquires a dependency on somebody
 * else's uptime. A tag the runner has to be asked for cannot do that.
 *
 * A tagged spec still has to earn its place: it is the only thing that can
 * catch a third party changing its contract, which every stubbed spec passes
 * straight through. See `docs/google-sheets-e2e.md` for that argument in full.
 */
export const E2E_THIRD_PARTY_TAG = "@third-party";

/**
 * True when the run was explicitly asked for its third-party specs.
 *
 * Opt in through `pnpm test:e2e:third-party` (or `./scripts/runAllTests.sh
 * --third-party`), so a bare `pnpm test:e2e` never reaches the network for
 * anything but the app's own servers.
 */
export function isE2EThirdPartyMode(): boolean {
  return process.env.PLAYWRIGHT_E2E_THIRD_PARTY === "1";
}

/**
 * Reads the credentials a third-party spec needs, throwing when any is absent.
 *
 * Throws rather than skipping on purpose. Skipping is right for a spec nobody
 * asked for, and wrong for one that was named explicitly: a run invoked as
 * `--third-party` that reports green having quietly skipped the only spec that
 * touches the third party is worse than a red one, because it is the same
 * green as a run that actually talked to the service.
 *
 * @param variableNames Env var names the spec cannot run without.
 * @returns Each requested name mapped to its non-empty value.
 */
export function requireE2EThirdPartyEnv<Name extends string>(
  variableNames: readonly Name[],
): Record<Name, string> {
  const missing = variableNames.filter((name) => {
    return !process.env[name];
  });
  if (missing.length > 0) {
    throw new Error(
      `Third-party e2e run is missing ${missing.join(", ")}. Set them in ` +
        "`.env.development` or the environment, or drop --third-party to skip " +
        "the specs that need them.",
    );
  }
  return Object.fromEntries(
    variableNames.map((name) => {
      return [name, process.env[name]!];
    }),
  ) as Record<Name, string>;
}
