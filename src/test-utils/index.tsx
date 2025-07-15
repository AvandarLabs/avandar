import { RenderOptions, render as renderReact } from "@testing-library/react";
import { ReactElement } from "react";
import { AvandarUIProvider } from "@/components/common/AvandarUIProvider";

/**
 * Renders the given UI with the Avandar UI provider, which adds
 * things like MantineProvider, ModalsProvider, and Notifications.
 *
 * @param ui The UI to render.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): void {
  renderReact(ui, {
    wrapper: AvandarUIProvider,
    ...options,
  });
}

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";
