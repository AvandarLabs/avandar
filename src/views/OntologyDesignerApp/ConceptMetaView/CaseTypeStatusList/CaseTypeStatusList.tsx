import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Badge, Text } from "@mantine/core";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  defaultStatusId: ConceptStatus.Id;
  /** Records per status. Unset while the counts load. */
  recordCounts: Partial<Record<ConceptStatus.Id, number>> | undefined;
};

/**
 * A case type's statuses as the people working its records meet them: each
 * one's badge and meaning, how many records hold it, and which one new
 * records start in.
 */
export function CaseTypeStatusList({
  statuses,
  defaultStatusId,
  recordCounts,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <ul className={css.caseTypeStatusList} aria-label={t`Statuses`}>
      {statuses.map((status) => {
        return (
          <li key={status.id} className={css.caseTypeStatusListRow}>
            <div className={css.caseTypeStatusListName}>
              <StatusBadge
                name={status.name}
                color={status.color}
                withTooltip={false}
              />
              {status.id === defaultStatusId ? (
                <Badge
                  variant="outline"
                  color="neutral"
                  radius="sm"
                  size="sm"
                  tt="none"
                  fw={500}
                >
                  <Trans>Default</Trans>
                </Badge>
              ) : null}
            </div>
            {status.description ? (
              <Text size="sm" c="dimmed">
                {status.description}
              </Text>
            ) : null}
            {recordCounts === undefined ? null : (
              <Text size="sm" c="dimmed" className={css.caseTypeStatusListCount}>
                <Plural
                  value={recordCounts[status.id] ?? 0}
                  one="# record"
                  other="# records"
                />
              </Text>
            )}
          </li>
        );
      })}
    </ul>
  );
}
