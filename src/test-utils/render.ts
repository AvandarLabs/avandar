import { RenderOptions, render as renderReact } from "@testing-library/react";
import { ReactElement } from "react";
import { TestProviders } from "./TestProviders";

/**
 * Renders `ui` wrapped with {@link TestProviders}, the project's
 * standard test wrapper (Mantine UI + Lingui). Tests that mount any
 * component pulling from `useLingui()` or rendering `<Trans>` must use
 * this `render` instead of the raw one from `@testing-library/react`.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): void {
  renderReact(ui, {
    wrapper: TestProviders,
    ...options,
  });
}
