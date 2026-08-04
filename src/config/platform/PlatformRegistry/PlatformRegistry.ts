import type { PlatformImpls } from "../PlatformProvider/PlatformProvider";

/*
 * Module-level accessor for the platform implementations resolved by
 * `PlatformProvider`. React consumers should read the impls through
 * `usePlatform()`; non-React modules (plain TypeScript files under
 * `src/clients/`, utilities, etc.) read them here instead.
 *
 * Init order: `PlatformProvider` populates the registry via
 * `setImpls` on mount (see `PlatformProvider.tsx`). Reading
 * before that throws loudly so an out-of-order call site surfaces at
 * the first invocation instead of returning a silent `null`.
 */

let impls: PlatformImpls | undefined;

function _setImpls(platformImpls: PlatformImpls): void {
  impls = platformImpls;
}

function _getImpls(): PlatformImpls {
  if (impls === undefined) {
    throw new Error(
      "PlatformRegistry.getImpls called before PlatformProvider mounted. " +
        "Move the call inside a function/method body that runs after first render, " +
        "or use usePlatform() from a React component.",
    );
  }
  return impls;
}

function _resetForTests(): void {
  impls = undefined;
}

/** Registry for platform implementations used outside React components. */
export const PlatformRegistry = {
  /**
   * Registers the platform implementations resolved by `PlatformProvider`.
   * Called once at provider mount. Calling again replaces the prior value,
   * which supports test isolation and development remounts.
   *
   * @param next - The {@link PlatformImpls} to register.
   */
  setImpls: _setImpls,

  /**
   * Reads the registered platform implementations. Throws when called
   * before `setImpls` has run, which means before the React tree's
   * `PlatformProvider` has mounted. Non-React modules calling this from
   * module top-level should defer the read until they're actually
   * invoked.
   *
   * @returns The {@link PlatformImpls} registered by `PlatformProvider`.
   */
  getImpls: _getImpls,

  /**
   * Test-only seam. Clears the registered impls so the next test can
   * register its own. Do not call from app code.
   */
  resetForTests: _resetForTests,
};
