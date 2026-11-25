import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";

/**
 * The chart area's loading state while a plugin chart's manifest or code
 * downloads. `PluginVizRenderer` and `PluginVizCodeLoader` render it.
 */
export function PluginVizChartLoader(): JSX.Element {
  const { t } = useLingui();
  return (
    <Center h="100%" w="100%">
      <Loader size="sm" role="status" aria-label={t`Loading chart`} />
    </Center>
  );
}
