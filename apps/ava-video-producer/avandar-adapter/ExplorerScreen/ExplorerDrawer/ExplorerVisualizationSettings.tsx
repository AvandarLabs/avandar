import { Stack, Text } from "@mantine/core";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import { aggregateColumns, barConfig } from "../ExplorerTimeline";
import type { ExplorerDrawerProps } from "./ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = Pick<ExplorerDrawerProps, "stage">;

const _noop = () => {};

/** Chart settings and table guidance follow the active visualization mode. */
export function ExplorerVisualizationSettings({
  stage,
}: Readonly<Props>): ReactNode {
  return stage.isChart ? (
    <SeriesAwareVizForm
      fields={aggregateColumns}
      config={barConfig}
      onConfigChange={_noop}
      layout="columns"
    />
  ) : (
    <Stack gap={4} p="sm">
      <Text size="sm" fw={600} c="neutral.7">
        Table view has no chart settings.
      </Text>
      <Text size="xs" c="neutral.6">
        Pick a chart type above to configure one.
      </Text>
    </Stack>
  );
}
