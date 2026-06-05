/**
 * Single entry point for test helpers. Re-exports everything from
 * `@testing-library/react` so callers can pull `screen`, `fireEvent`,
 * `waitFor`, etc. from one place, and overrides `render` with the
 * `TestProviders`-wrapped variant from {@link ./render}.
 */
export * from "@testing-library/react";
export { render } from "./render";
export { TestProviders } from "./TestProviders";
