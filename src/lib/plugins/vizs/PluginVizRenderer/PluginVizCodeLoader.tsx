import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizChartLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader";
import { PluginVizLoadedChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart";
import { usePluginVizCode } from "@/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizInput } from "@avandar/plugin-sdk";

type Props = {
  lookup: Extract<PluginVizTypeLookup, { status: "ready" }>;
  input: PluginVizInput;
};

/**
 * Loads a plugin chart's code and draws the chart. The chart area shows a
 * loader while the chunks download, and a Retry button when they fail to.
 * `PluginVizConfiguredChart` renders it once every required setting has a
 * value.
 */
export function PluginVizCodeLoader({ lookup, input }: Props): JSX.Element {
  const { i18n } = useLingui();
  const { entry, manifestModule, vizType } = lookup;
  const code = usePluginVizCode({ entry, vizId: vizType.id });
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  const title = localize(vizType.title);
  if (code.status === "loading") {
    return <PluginVizChartLoader />;
  }
  if (code.status === "failed") {
    return (
      <PluginVizPlaceholder
        reason="loadFailed"
        pluginId={entry.id}
        title={title}
        onRetry={code.retry}
      />
    );
  }
  return (
    <PluginVizLoadedChart
      code={code}
      pluginId={entry.id}
      vizType={vizType}
      input={input}
      title={title}
      pluginName={localize(manifestModule.manifest.name)}
    />
  );
}
