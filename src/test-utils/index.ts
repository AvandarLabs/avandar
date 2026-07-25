/**
 * Single entry point for test helpers. Exposes the bits of
 * `@testing-library/react` that tests in this repo actually use, and
 * overrides `render` with the `TestProviders`-wrapped variant from
 * {@link ./render}. Add more named re-exports here as new helpers are
 * needed in tests.
 */
export {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
export type { RenderOptions } from "@testing-library/react";
export { render } from "./render/render";
export { TestProviders } from "./TestProviders";
