import { prop } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useMemo } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { RemovedStatusRow } from "@/components/caseStatuses/StatusSetEditor/RemovedStatusRow";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  value: ConceptStatus.SetValue;
  savedStatuses: readonly ConceptStatus.T[];
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  replacements: StatusReplacements;
  errorsByStatusId: Partial<Record<ConceptStatus.Id, string>>;
  onReplacementsChange: (replacements: StatusReplacements) => void;
};

/**
 * Saved statuses the user removed that records still hold. Each one asks
 * where its records go. A removed status with no records needs nothing and
 * is not listed.
 */
export function RemovedStatusList({
  value,
  savedStatuses,
  recordCounts,
  replacements,
  errorsByStatusId,
  onReplacementsChange,
}: Readonly<Props>): ReactNode {
  const removedWithRecords = useMemo(() => {
    const removedIds = new Set(
      ConceptStatus.getRemovedStatusIds({
        savedStatusIds: savedStatuses.map(prop("id")),
        statuses: value.statuses,
      }),
    );
    return savedStatuses.filter((status) => {
      return removedIds.has(status.id) && (recordCounts[status.id] ?? 0) > 0;
    });
  }, [savedStatuses, value.statuses, recordCounts]);

  if (removedWithRecords.length === 0) {
    return null;
  }

  return (
    <div className={css.statusSetEditorRemoved}>
      <Text size="xs" fw={600} c="neutral.7">
        <Trans>Removed statuses that records still use</Trans>
      </Text>
      <ul className={css.statusSetEditorRemovedList}>
        {removedWithRecords.map((status) => {
          return (
            <RemovedStatusRow
              key={status.id}
              status={status}
              recordCount={recordCounts[status.id] ?? 0}
              remainingStatuses={value.statuses}
              replacementId={replacements[status.id]}
              error={errorsByStatusId[status.id]}
              onReplacementChange={(replacementId) => {
                onReplacementsChange({
                  ...replacements,
                  [status.id]: replacementId,
                });
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
