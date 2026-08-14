import { useLingui } from "@lingui/react/macro";
import { Loader, Paper } from "@mantine/core";
import { StatusShell } from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell";
import type { ReactNode } from "react";

/** Reports that the active map layer is loading. */
export function MapLoadingStatus(): ReactNode {
  const { t } = useLingui();
  return (
    <StatusShell>
      <Paper p="xs" radius="md" withBorder>
        <Loader size="sm" aria-label={t`Loading map data`} />
      </Paper>
    </StatusShell>
  );
}
