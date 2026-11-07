import {
  evaluateWhenCondition,
  getLocalizedTextFromManifestStrings,
} from "@avandar/plugin-manifest/runtime";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginIconComponent } from "@/lib/plugins/PluginIndex.types";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";

/**
 * One plugin command ready to render in a slot, with its text already
 * localized. A slot renders it as a button or menu item and passes `plugin`
 * and `commandId` back to run it.
 */
export type PluginMenuItem = Readonly<{
  /** Unique within a slot, so it can be a React key. */
  key: string;
  plugin: ActivePlugin;
  pluginName: string;
  commandId: string;
  title: string;

  /** Undefined when the plugin's bundle has no icon of that name. */
  Icon: PluginIconComponent | undefined;
}>;

/**
 * Gets the commands that active plugins place in a slot and whose `when`
 * condition holds for the slot's current facts. Lets a slot decide what to
 * render, for example the plugin buttons in the Data Explorer toolbar.
 */
export function getMenuItemsFromActivePlugins(options: {
  activePlugins: readonly ActivePlugin[];
  slotId: SlotId;
  facts: WhenFacts;
  locale: string;
}): PluginMenuItem[] {
  const { activePlugins, slotId, facts, locale } = options;
  return activePlugins.flatMap((plugin) => {
    const { manifest, strings, icons } = plugin.manifestModule;
    const pluginName = getLocalizedTextFromManifestStrings({
      strings,
      locale,
      value: manifest.name,
    });
    return (manifest.contributes.menus[slotId] ?? []).flatMap((menuEntry) => {
      const command = manifest.contributes.commands.find((candidate) => {
        return candidate.id === menuEntry.command;
      });
      if (
        command === undefined ||
        !evaluateWhenCondition(menuEntry.when, facts)
      ) {
        return [];
      }
      return [
        {
          key: `${manifest.id}/${command.id}`,
          plugin,
          pluginName,
          commandId: command.id,
          title: getLocalizedTextFromManifestStrings({
            strings,
            locale,
            value: command.title,
          }),
          Icon: icons[command.icon],
        },
      ];
    });
  });
}
