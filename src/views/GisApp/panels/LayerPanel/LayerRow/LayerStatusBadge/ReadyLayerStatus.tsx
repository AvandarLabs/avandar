import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

type Props = { droppedRowCount: number; featureCount: number };

/** Reports mapped and unmapped counts for a ready layer. */
export function ReadyLayerStatus({
  droppedRowCount,
  featureCount,
}: Props): ReactNode {
  const { t } = useLingui();
  if (droppedRowCount > 0) {
    return (
      <Badge
        color="warning"
        variant="light"
        size="xs"
        leftSection={<IconAlertTriangle size={9} stroke={2.4} />}
      >
        {t`${droppedRowCount} rows unmapped`}
      </Badge>
    );
  }
  return featureCount === 1 ? t`1 point` : t`${featureCount} points`;
}
