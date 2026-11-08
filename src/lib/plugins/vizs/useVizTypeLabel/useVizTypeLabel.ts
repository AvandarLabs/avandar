import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

/**
 * Gets the display name of a chart's type in the current language, such as
 * "Bar Chart", or for a plugin chart the title its plugin's manifest gives
 * it. Lets a chart header or summary name plugin charts the way their plugin
 * titles them. A plugin chart reads "Plugin chart" until its manifest loads,
 * and when its plugin is not bundled.
 */
export function useVizTypeLabel(config: AvaVizConfig.T | UiVizConfig): string {
  const { t, i18n } = useLingui();
  const lookup = usePluginVizType(
    config.vizType === "plugin" ? config : undefined,
  );
  if (config.vizType !== "plugin") {
    return vizTypeLabel(config.vizType);
  }
  if (lookup.status !== "ready") {
    return t`Plugin chart`;
  }
  return getLocalizedTextFromManifestStrings({
    strings: lookup.manifestModule.strings,
    locale: i18n.locale,
    value: lookup.vizType.title,
  });
}
