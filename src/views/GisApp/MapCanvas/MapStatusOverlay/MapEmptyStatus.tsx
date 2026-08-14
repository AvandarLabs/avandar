import { Trans } from "@lingui/react/macro";
import { Paper, Text } from "@mantine/core";
import { StatusShell } from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell";
import type { ReactNode } from "react";

/** Reports that the configured source contains no mappable rows. */
export function MapEmptyStatus(): ReactNode {
  return (
    <StatusShell>
      <Paper p="xs" radius="md" withBorder>
        <Text size="sm">
          <Trans>No mappable rows in this data source.</Trans>
        </Text>
      </Paper>
    </StatusShell>
  );
}
