import { useLingui } from "@lingui/react/macro";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizTransformChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart";
import type { PluginVizCodeLookup } from "@/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { PluginVizInput } from "@avandar/plugin-sdk";

type Props = {
  code: Extract<PluginVizCodeLookup, { status: "ready" }>;
  pluginId: string;
  vizType: PluginVizType;
  input: PluginVizInput;

  /** The chart type's localized title, which the render-failed state names. */
  title: string;

  /**
   * The plugin's localized name, which a crashing chart component is logged
   * under.
   */
  pluginName: string;
};

/**
 * Draws a plugin chart once its code has loaded, the way its manifest says:
 * a transform chart through `PluginVizTransformChart`, a component chart
 * through the runtime's `PluginVizComponentView`. Code that declares no
 * usable chart shows the render-failed state. `PluginVizCodeLoader` renders
 * it.
 */
export function PluginVizLoadedChart({
  code,
  pluginId,
  vizType,
  input,
  title,
  pluginName,
}: Props): JSX.Element {
  const { i18n } = useLingui();
  const { runtime, definition, messages } = code;
  const renderFailed = (
    <PluginVizPlaceholder
      reason="renderFailed"
      pluginId={pluginId}
      title={title}
    />
  );
  if (definition === undefined) {
    return renderFailed;
  }
  const chartOptions = {
    definition,
    vizId: vizType.id,
    input,
    messages,
    locale: i18n.locale,
  };
  const { PluginVizComponentView } = runtime;
  return vizType.render === "transform" ? (
    <PluginVizTransformChart
      runtime={runtime}
      chartOptions={chartOptions}
      pluginId={pluginId}
      title={title}
    />
  ) : (
    <PluginVizComponentView
      {...chartOptions}
      pluginName={pluginName}
      errorFallback={renderFailed}
    />
  );
}
