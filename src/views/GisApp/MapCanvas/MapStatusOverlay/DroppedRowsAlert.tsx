import { useLingui } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = { featureCount: number; droppedRowCount: number };

/** Warns that some or all rows carried coordinates that could not be mapped. */
export function DroppedRowsAlert({
  featureCount,
  droppedRowCount,
}: Props): ReactNode {
  const { t } = useLingui();
  const totalRowCount = featureCount + droppedRowCount;
  const isEverythingDropped = featureCount === 0;
  return (
    <Alert
      color="warning"
      title={
        isEverythingDropped ?
          t`No rows could be mapped`
        : t`Some rows could not be mapped`
      }
    >
      <Text size="sm">
        {isEverythingDropped ?
          t`None of the ${totalRowCount} rows could be mapped because their coordinates were missing or out of range.`
        : t`${droppedRowCount} of ${totalRowCount} rows were skipped because their coordinates were missing or out of range.`
        }
      </Text>
    </Alert>
  );
}
