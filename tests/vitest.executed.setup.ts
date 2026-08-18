import path from "node:path";
import dotenv from "dotenv";
import { expect } from "vitest";

// Executed tests run under `environment: "node"`, so this setup file omits
// everything in `./vitest.setup.ts` that touches DOM globals (`window`,
// jest-dom matchers, the Lingui i18n activation, React Testing Library
// cleanup). Only the runtime-independent parts are carried over: loading
// `.env.development` and the custom `toHaveSameMembers` matcher, both of
// which a later executed test may need.

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });

// Local `.env.development` may enable product feature flags that change
// which components mount in tests. Executed tests do not mount components,
// but we clear this for consistency with the jsdom setup.
delete process.env.VITE_FEATURE_FLAGS;

function _expectToHaveSameMembers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  received: readonly any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expected: readonly any[],
) {
  const pass =
    Array.isArray(received) &&
    Array.isArray(expected) &&
    received.length === expected.length &&
    expected.every((val) => {
      return received.includes(val);
    }) &&
    received.every((val) => {
      return expected.includes(val);
    });
  if (pass) {
    return {
      message: () => {
        return `expected [${received}] not to have the same members as [${expected}]`;
      },
      pass: true,
    };
  }

  return {
    message: () => {
      return `expected [${received}] to have the same members as [${expected}]`;
    },
    pass: false,
  };
}

expect.extend({
  toHaveSameMembers: _expectToHaveSameMembers,
});

// extend the `expect` object with the custom matcher's type
type CustomMatchers<R = unknown> = {
  /**
   * Matcher to check if two arrays have the same members, where order does
   * not matter.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toHaveSameMembers(expected: readonly any[]): R;
};

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-empty-object-type */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Matchers<T = any> extends CustomMatchers<T> {}
  /* eslint-enable */
}
