import { Select } from "@avandar/ui";
import { Plural, useLingui } from "@lingui/react/macro";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The saved status the user removed. */
  status: ConceptStatus.T;
  recordCount: number;
  /** The statuses still in the set, which the records can move to. */
  remainingStatuses: readonly ConceptStatus.Draft[];
  replacementId: ConceptStatus.Id | undefined;
  error: string | undefined;
  onReplacementChange: (replacementId: ConceptStatus.Id | undefined) => void;
};

/**
 * A removed status that records still hold: its badge, and where those
 * records move when the set is saved.
 */
export function RemovedStatusRow({
  status,
  recordCount,
  remainingStatuses,
  replacementId,
  error,
  onReplacementChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const options = remainingStatuses.map((remaining) => {
    return {
      value: remaining.id,
      label: remaining.name.trim() || t`Untitled status`,
    };
  });

  return (
    <li
      className={css.statusSetEditorRemovedRow}
      aria-label={t`Removed: ${status.name}`}
    >
      <StatusBadge
        name={status.name}
        color={status.color}
        withTooltip={false}
      />
      <Select<ConceptStatus.Id>
        size="xs"
        className={css.statusSetEditorReplacement}
        label={
          <Plural
            value={recordCount}
            one="Move # record to"
            other="Move # records to"
          />
        }
        placeholder={t`Choose a status`}
        data={options}
        value={replacementId ?? null}
        error={error}
        onChange={(nextReplacementId) => {
          onReplacementChange(nextReplacementId ?? undefined);
        }}
      />
    </li>
  );
}
