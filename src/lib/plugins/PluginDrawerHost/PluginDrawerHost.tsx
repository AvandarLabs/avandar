import { Drawer } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Fragment, useEffect, useSyncExternalStore } from "react";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";

/**
 * Renders the drawer a plugin opens with `avandar.ui.openDrawer`. The plugin
 * host mounts it once, so a command can open a drawer without owning any
 * React state.
 *
 * It is rendered at startup, so it must not import the plugin SDK runtime or
 * `makePluginApi`.
 */
export function PluginDrawerHost(): JSX.Element {
  const { t } = useLingui();
  const drawer = useSyncExternalStore(
    PluginDrawerStore.subscribe,
    PluginDrawerStore.getSnapshot,
  );

  // A workspace switch unmounts the host. Drop the drawer so the next host
  // does not show a plugin's drawer from the previous workspace.
  useEffect(() => {
    return PluginDrawerStore.clear;
  }, []);

  return (
    <Drawer
      opened={drawer?.isOpen ?? false}
      onClose={PluginDrawerStore.close}
      onExitTransitionEnd={PluginDrawerStore.clearClosed}
      title={drawer?.title}
      closeButtonProps={{ "aria-label": t`Close` }}
      position="right"
      size="lg"
    >
      {/* Keying on the open remounts the content, so a drawer that opens
          after another one never inherits its state or its error boundary. */}
      <Fragment key={drawer?.openId}>{drawer?.content}</Fragment>
    </Drawer>
  );
}
