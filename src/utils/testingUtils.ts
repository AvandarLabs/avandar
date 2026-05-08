import { RenderOptions, render as renderReact } from "@testing-library/react";
import { ReactElement } from "react";
import { AvandarUiProvider } from "@/components/common/AvandarUiProvider";

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
    wrapper: AvandarUiProvider,
    ...options,
  });
}

export * from "@testing-library/react";
