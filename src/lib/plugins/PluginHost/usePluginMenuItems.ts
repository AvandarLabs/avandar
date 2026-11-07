import { useLingui } from "@lingui/react/macro";
import { useContext } from "react";
import { getMenuItemsFromActivePlugins } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";

/**
 * Gets the commands that the workspace's active plugins place in a slot,
 * localized to the current language and filtered by the slot's facts. Lets a
 * slot, such as a toolbar, render plugin commands without knowing which
 * plugins are installed.
 */
export function usePluginMenuItems(options: {
  slotId: SlotId;
  facts: WhenFacts;
}): PluginMenuItem[] {
  const activePlugins = useContext(ActivePluginsContext);
  const { i18n } = useLingui();
  return getMenuItemsFromActivePlugins({
    activePlugins,
    locale: i18n.locale,
    ...options,
  });
}
