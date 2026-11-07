import { Drawer } from "@avandar/ui";
import { useSyncExternalStore } from "react";
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
  const drawer = useSyncExternalStore(
    PluginDrawerStore.subscribe,
    PluginDrawerStore.getSnapshot,
  );
  return (
    <Drawer
      opened={drawer !== undefined}
      onClose={PluginDrawerStore.close}
      title={drawer?.title}
      position="right"
      size="lg"
    >
      {drawer?.content}
    </Drawer>
  );
}
