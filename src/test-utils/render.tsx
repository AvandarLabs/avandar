import { render as renderReact } from "@testing-library/react";
import { TestProviders } from "./TestProviders";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * Renders `ui` wrapped with {@link TestProviders}, the project's standard
 * test wrapper (Mantine UI + Lingui). Tests that mount any component
 * pulling from `useLingui()` or rendering `<Trans>` must use this `render`
 * instead of the raw one from `@testing-library/react`.
 *
 * When `options.wrapper` is provided, it is composed *inside*
 * `TestProviders` so the test wrapper can add extra providers (for
 * example `QueryClientProvider`) on top of the always-required ones.
 *
 * Returns the full `RenderResult` (with `container`, `rerender`,
 * `unmount`, etc.) so callers keep the same surface as
 * `@testing-library/react`'s `render`.
 */
export function render(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const { wrapper: ExtraWrapper, ...rest } = options ?? {};
  const Wrapper =
    ExtraWrapper === undefined ? TestProviders : (
      ({ children }: { children: ReactNode }): JSX.Element => {
        return (
          <TestProviders>
            <ExtraWrapper>{children}</ExtraWrapper>
          </TestProviders>
        );
      }
    );
  return renderReact(ui, {
    wrapper: Wrapper,
    ...rest,
  });
}
