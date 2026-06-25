import { createContext, useContext } from "react";
import { render as renderReact } from "@testing-library/react";
import { TestProviders } from "./TestProviders";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ComponentType, ReactElement, ReactNode } from "react";

const ExtraWrapperContext = createContext<ComponentType<{
  children: ReactNode;
}> | null>(null);

/**
 * Stable wrapper component nesting an optional caller-supplied
 * `ExtraWrapper` (read from React context, since RTL only accepts a
 * single `wrapper`) inside the always-required `TestProviders`.
 * Defined at module scope so React sees a stable component type
 * across every `render()` call, instead of remounting a fresh
 * anonymous component each time.
 */
function RenderWithWrappers({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const ExtraWrapper = useContext(ExtraWrapperContext);
  if (ExtraWrapper === null) {
    return <TestProviders>{children}</TestProviders>;
  }
  return (
    <TestProviders>
      <ExtraWrapper>{children}</ExtraWrapper>
    </TestProviders>
  );
}

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
  options: RenderOptions = {},
): RenderResult {
  const { wrapper: ExtraWrapper, ...rest } = options;
  return renderReact(
    <ExtraWrapperContext.Provider value={ExtraWrapper ?? null}>
      {ui}
    </ExtraWrapperContext.Provider>,
    {
      wrapper: RenderWithWrappers,
      ...rest,
    },
  );
}
