import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { useContext, useMemo } from "react";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { makePluginVizOptionValue } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";

/**
 * One plugin chart type a chart type picker can offer, with its title already
 * localized. `value` is the encoded picker value, and `selection` and
 * `vizType` give the picker what it needs to build the chart's config once
 * the option is picked.
 */
export type PluginVizOption = Readonly<{
  value: string;
  label: string;
  selection: PluginVizSelection;
  vizType: PluginVizType;
}>;

function _getOptionsFromPlugin(options: {
  plugin: ActivePlugin;
  locale: string;
}): PluginVizOption[] {
  const { plugin, locale } = options;
  const { manifest, strings } = plugin.manifestModule;
  return manifest.contributes.vizTypes.map((vizType) => {
    const selection = { pluginId: manifest.id, pluginVizId: vizType.id };
    return {
      value: makePluginVizOptionValue(selection),
      label: getLocalizedTextFromManifestStrings({
        strings,
        locale,
        value: vizType.title,
      }),
      selection,
      vizType,
    };
  });
}

/**
 * Gets the chart types of the plugins that are live in the current
 * workspace (installed, enabled, and with their permissions approved),
 * localized to the current language. Lets a chart type picker list plugin
 * charts next to the built-in ones, for example in the Data Explorer.
 * Outside a plugin host it returns no options.
 */
export function usePluginVizOptions(): PluginVizOption[] {
  const activePlugins = useContext(ActivePluginsContext);
  const { i18n } = useLingui();
  return useMemo(() => {
    return activePlugins.flatMap((plugin) => {
      return _getOptionsFromPlugin({ plugin, locale: i18n.locale });
    });
  }, [activePlugins, i18n.locale]);
}
