import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

const noop = (): void => {
  return;
};

function expectToHaveSameMembers(
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

// setup the Vitest environment with any customizations, extensions, and mocks
// that we need for tests.
function setupVitest() {
  expect.extend(matchers);
  expect.extend({
    toHaveSameMembers: expectToHaveSameMembers,
  });

  // add a mocked implementation of `matchMedia` for all tests
  if (!window.matchMedia) {
    window.matchMedia = function (query): MediaQueryList {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: noop,
        removeListener: noop,
        addEventListener: noop,
        removeEventListener: noop,
        dispatchEvent: () => {
          return false;
        },
      };
    };
  }

  // add a mocked implementation of `ResizeObserver` for all tests
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
}

setupVitest();
afterEach(() => {
  cleanup();
});

// extend the `expect` object with custom matchers
interface CustomMatchers<R = unknown> {
  /**
   * Matcher to check if two arrays have the same members, where order deos
   * not matter.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toHaveSameMembers(expected: readonly any[]): R;
}

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-empty-object-type */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Matchers<T = any> extends CustomMatchers<T> {}
  /* eslint-enable */
}
