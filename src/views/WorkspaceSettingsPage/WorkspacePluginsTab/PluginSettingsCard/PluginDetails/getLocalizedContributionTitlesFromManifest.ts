import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { getContributionsFromManifest } from "@/lib/plugins/getContributionsFromManifest/getContributionsFromManifest";
import type {
  PluginLocaleMessages,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/** What a plugin adds, by kind, with each title in the reader's language. */
export type LocalizedContributionTitles = {
  toolbarCommandTitles: string[];
  chartTypeTitles: string[];
  dataSlotTitles: string[];
};

/**
 * Gets the titles of a plugin's toolbar commands, chart types, and data
 * slots, localized with the plugin's own strings. Use it to fill
 * `PluginAdditionsSection`, for example on a plugin's settings card or in the
 * install wizard's review step.
 */
export function getLocalizedContributionTitlesFromManifest(options: {
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
  locale: string;
}): LocalizedContributionTitles {
  const { manifest, strings, locale } = options;
  const { dataExplorerToolbarCommands, chartTypes } =
    getContributionsFromManifest(manifest);
  const getTitles = (contributions: ReadonlyArray<{ title: string }>) => {
    return contributions.map((contribution) => {
      return getLocalizedTextFromManifestStrings({
        strings,
        locale,
        value: contribution.title,
      });
    });
  };
  return {
    toolbarCommandTitles: getTitles(dataExplorerToolbarCommands),
    chartTypeTitles: getTitles(chartTypes),
    dataSlotTitles: getTitles(Object.values(manifest.dataSlots)),
  };
}
