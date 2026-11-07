import { useLingui } from "@lingui/react/macro";
import { useContext, useMemo } from "react";
import { getMenuItemsFromActivePlugins } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";

/**
 * Gets the commands that the workspace's active plugins place in a slot,
 * localized to the current language and filtered by the slot's facts. Lets a
 * slot, such as a toolbar, render plugin commands without knowing which
 * plugins are installed.
 *
 * The items are memoized on the active plugins, the slot, the facts, and the
 * language. Callers pass memoized `facts`, or the items are rebuilt on every
 * render.
 */
export function usePluginMenuItems(options: {
  slotId: SlotId;
  facts: WhenFacts;
}): PluginMenuItem[] {
  const { slotId, facts } = options;
  const activePlugins = useContext(ActivePluginsContext);
  const { i18n } = useLingui();
  return useMemo(() => {
    return getMenuItemsFromActivePlugins({
      activePlugins,
      slotId,
      facts,
      locale: i18n.locale,
    });
  }, [activePlugins, slotId, facts, i18n.locale]);
}
