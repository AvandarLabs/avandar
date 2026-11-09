import { Callout } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Component } from "react";
import { Logger } from "@/utils/Logger";
import type { ReactNode } from "react";

type Props = Readonly<{ pluginName: string; children: ReactNode }>;
type State = Readonly<{ hasError: boolean }>;

/**
 * Contains a crash inside plugin UI to the modal or drawer that renders it,
 * so the rest of the app keeps working. `makePluginApi` wraps the content of
 * every overlay a plugin opens in it.
 *
 * This is a class because React offers no hook for catching render errors:
 * `getDerivedStateFromError` and `componentDidCatch` exist only on class
 * components. It is the one place this feature uses a class.
 */
export class PluginErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    Logger.error("Plugin UI crashed", {
      pluginName: this.props.pluginName,
      error,
    });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Callout.Error title={this.props.pluginName}>
          <Trans>
            Something went wrong in this plugin. Close this panel and try again.
          </Trans>
        </Callout.Error>
      );
    }
    return this.props.children;
  }
}
