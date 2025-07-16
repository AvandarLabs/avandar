import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

const noop = (): void => {
  return;
};

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

afterEach(() => {
  cleanup();
});
