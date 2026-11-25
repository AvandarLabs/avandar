import { DEFAULT_ENV_NAME } from "@ava-cli/AvaEnv/AvaEnv";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import { Acclimate } from "@avandar/acclimate";
import { expect, vi } from "vitest";
import type { MockInstance } from "vitest";

/**
 * Runs `ava <argvAfterAva>` through Acclimate's real argument parser, from a
 * root CLI cut down to what routes a release command: the global `--env`
 * option and the `release` command. Acclimate does not hand back a promise,
 * so the caller waits for the outcome it expects, for example with
 * {@link waitForFirstCall} or {@link expectRefusalWithoutCall}.
 *
 * Use it to prove what a release command does with argv as a user types it,
 * such as `["release", "notes", "--dry-run"]`.
 */
export function runAvaThroughRealParser(argvAfterAva: readonly string[]): void {
  process.argv = [process.execPath, "ava", ...argvAfterAva];
  Acclimate.run(
    Acclimate.createCLI("ava")
      // The tests' only copy of the root CLI's global options. `main.ts`
      // declares the real ones but runs the CLI on import, so it cannot be
      // imported here. The `AVA_GLOBAL_FLAGS` test pins main.ts's names.
      .addGlobalOption({
        name: "--env",
        type: "string",
        required: false,
        defaultValue: DEFAULT_ENV_NAME,
      })
      .addCommand("release", ReleaseCli),
  );
}

/**
 * Waits for a mocked function's first call and returns its arguments. Use it
 * after {@link runAvaThroughRealParser} to read what a release command handed
 * the function that does the work, such as the options `runRelease` got.
 */
export async function waitForFirstCall<TArgs extends unknown[]>(
  mockedFunction: MockInstance<(...args: TArgs) => unknown>,
): Promise<TArgs> {
  await vi.waitFor(() => {
    expect(mockedFunction).toHaveBeenCalled();
  });
  const firstCall = mockedFunction.mock.calls[0];
  if (firstCall === undefined) {
    throw new Error("The mocked function was called but has no first call.");
  }
  return firstCall;
}

/**
 * Waits for a release command to exit with code 1, then asserts its output
 * contains `expectedText` and that `guardedFunction`, the one that does the
 * work, was never called. Use it after {@link runAvaThroughRealParser} to
 * prove a refused argv changed nothing, for example that no release started.
 */
export async function expectRefusalWithoutCall<TArgs extends unknown[]>(
  options: Readonly<{
    expectedText: string;
    readOutput: () => string;
    guardedFunction: MockInstance<(...args: TArgs) => unknown>;
  }>,
): Promise<void> {
  await vi.waitFor(() => {
    expect(process.exitCode).toBe(1);
  });
  expect(options.readOutput()).toContain(options.expectedText);
  expect(options.guardedFunction).not.toHaveBeenCalled();
}
