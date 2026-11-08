import { Plural } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { Logger } from "@/utils/Logger";
import type { PluginVizRuntimeApi } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import type { PluginVizRunOptions } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";

type Props = {
  runtime: PluginVizRuntimeApi;
  chartOptions: PluginVizRunOptions;
  pluginId: string;

  /** The chart type's localized title, which the render-failed state names. */
  title: string;
};

/**
 * Runs a transform chart's transform, memoized on its input, and draws the
 * output with the built-in chart renderer. Under a chart built from a
 * truncated result it notes how many rows it read. A failed transform is
 * logged with the plugin and chart ids and shows the render-failed state.
 * `PluginVizLoadedChart` renders it.
 */
export function PluginVizTransformChart({
  runtime,
  chartOptions,
  pluginId,
  title,
}: Props): JSX.Element {
  const { definition, vizId, input, messages, locale } = chartOptions;
  const outcome = useMemo(() => {
    return runtime.runPluginVizTransform({
      definition,
      vizId,
      input,
      messages,
      locale,
    });
  }, [runtime, definition, vizId, input, messages, locale]);
  const rowCount = input.rows.length;

  useEffect(
    function logFailedTransform() {
      if (outcome.status === "failed") {
        Logger.error("Plugin chart failed to render", {
          pluginId,
          pluginVizId: vizId,
          error: outcome.error,
        });
      }
    },
    [outcome, pluginId, vizId],
  );

  if (outcome.status === "failed") {
    return (
      <PluginVizPlaceholder
        reason="renderFailed"
        pluginId={pluginId}
        title={title}
      />
    );
  }
  return (
    <Stack h="100%" w="100%" gap="xs">
      <Box flex={1} mih={0}>
        <UiVizConfigRenderer
          uiVizConfig={outcome.uiVizConfig}
          data={outcome.rows}
          dateColumns={outcome.dateColumns}
          columnNames={outcome.columnNames}
        />
      </Box>
      {input.isTruncated ? (
        <Text size="xs" c="dimmed" ta="center">
          <Plural
            value={rowCount}
            one="Built from the first row of the result."
            other="Built from the first # rows of the result."
          />
        </Text>
      ) : null}
    </Stack>
  );
}
