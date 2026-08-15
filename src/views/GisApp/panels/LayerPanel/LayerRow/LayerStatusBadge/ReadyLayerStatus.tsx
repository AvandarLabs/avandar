import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = { droppedRowCount: number; featureCount: number };

/** Reports mapped and unmapped counts for a ready layer. */
export function ReadyLayerStatus(props: Props): ReactNode {
  const { t } = useLingui();
  if (props.droppedRowCount > 0) {
    return (
      <Badge
        color="warning"
        variant="light"
        size="xs"
        leftSection={<IconAlertTriangle size={9} stroke={2.4} />}
      >
        {t`${props.droppedRowCount} rows unmapped`}
      </Badge>
    );
  }
  return props.featureCount === 1 ?
      <>{t`1 point`}</>
    : <>{t`${props.featureCount} points`}</>;
}
