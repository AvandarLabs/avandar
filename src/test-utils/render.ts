import {
  RenderOptions,
  RenderResult,
  render as renderReact,
} from "@testing-library/react";
import { ReactElement } from "react";
import { TestProviders } from "./TestProviders";

/**
 * Renders `ui` wrapped with {@link TestProviders}, the project's
 * standard test wrapper (Mantine UI + Lingui). Tests that mount any
 * component pulling from `useLingui()` or rendering `<Trans>` must use
 * this `render` instead of the raw one from `@testing-library/react`.
 *
 * Returns the full `RenderResult` (with `container`, `rerender`,
 * `unmount`, etc.) so callers keep the same surface as
 * `@testing-library/react`'s `render`.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return renderReact(ui, {
    wrapper: TestProviders,
    ...options,
  });
}
