import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";
import { StatusShell } from "@/views/GisApp/MapCanvas/MapStatusOverlay/StatusShell/StatusShell";
import type { ReactNode } from "react";

type Props = { error: Error };

/** Reports a layer-data error without exposing engine details in production. */
export function MapErrorStatus({ error }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  // The raw engine message is intentionally limited to development builds.
  const developmentDetails =
    import.meta.env.DEV ?
      <Text size="xs" c="dimmed" mt="xs">
        {error.message}
      </Text>
    : undefined;
  return (
    <StatusShell>
      <Alert color="danger" title={t`Could not load map data`}>
        <Text size="sm">
          <Trans>Something went wrong while loading this layer's data.</Trans>
        </Text>
        {developmentDetails}
      </Alert>
    </StatusShell>
  );
}
