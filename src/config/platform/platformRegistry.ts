import type { PlatformImpls } from "./PlatformProvider";

/*
 * Module-level accessor for the platform implementations resolved by
 * `PlatformProvider`. React consumers should read the impls through
 * `usePlatform()`; non-React modules (plain TypeScript files under
 * `src/clients/`, utilities, etc.) read them here instead.
 *
 * Init order: `PlatformProvider` populates the registry via
 * `setPlatformImpls` on mount (see `PlatformProvider.tsx`). Reading
 * before that throws loudly so an out-of-order call site surfaces at
 * the first invocation instead of returning a silent `null`.
 */

let impls: PlatformImpls | null = null;

/**
 * Registers the platform implementations resolved by `PlatformProvider`.
 * Called once at provider mount. Calling again replaces the prior value
 * — the React tree only mounts the provider once in production, so this
 * is a no-op outside tests.
 *
 * @param next - The {@link PlatformImpls} to register.
 */
export function setPlatformImpls(next: PlatformImpls): void {
  impls = next;
}

/**
 * Reads the registered platform implementations. Throws when called
 * before `setPlatformImpls` has run — i.e. before the React tree's
 * `PlatformProvider` has mounted. Non-React modules calling this from
 * module top-level should defer the read until they're actually
 * invoked.
 *
 * @returns The {@link PlatformImpls} registered by `PlatformProvider`.
 */
export function getPlatformImpls(): PlatformImpls {
  if (impls === null) {
    throw new Error(
      "platformRegistry.getPlatformImpls called before PlatformProvider mounted. " +
        "Move the call inside a function/method body that runs after first render, " +
        "or use usePlatform() from a React component.",
    );
  }
  return impls;
}

/**
 * Test-only seam. Clears the registered impls so the next test can
 * register its own. Do not call from app code.
 */
export function __resetPlatformImplsForTests(): void {
  impls = null;
}
