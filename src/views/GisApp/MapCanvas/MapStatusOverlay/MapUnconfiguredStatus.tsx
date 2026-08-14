import { Trans } from "@lingui/react/macro";
import { Paper, Text } from "@mantine/core";
import { StatusShell } from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell";
import type { ReactNode } from "react";

/** Prompts the author to finish configuring the layer's coordinate binding. */
export function MapUnconfiguredStatus(): ReactNode {
  return (
    <StatusShell>
      <Paper p="xs" radius="md" withBorder>
        <Text size="sm">
          <Trans>
            Pick a data source and its latitude and longitude columns to plot
            it.
          </Trans>
        </Text>
      </Paper>
    </StatusShell>
  );
}
