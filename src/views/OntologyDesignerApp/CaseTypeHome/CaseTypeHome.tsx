import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Loader, Text, Title } from "@mantine/core";

import { CaseTypeCard } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeCard";
import css from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.module.css";
import { NewCaseTypeCard } from "@/views/OntologyDesignerApp/CaseTypeHome/NewCaseTypeCard";

export type CaseTypeHomeItem = {
  id: string;
  name: string;
  description: string | undefined;
};

type Props = {
  caseTypes: readonly CaseTypeHomeItem[];
  onCreate: () => void;
  onOpenCaseType: (caseType: CaseTypeHomeItem) => void;
  /** Omitted when the caller does not support deleting case types. */
  onDeleteCaseType?: (caseType: CaseTypeHomeItem) => void;
  isLoading?: boolean;
};

/**
 * Case Manager home: a card grid of case types plus a dashed create card.
 */
export function CaseTypeHome({
  caseTypes,
  onCreate,
  onOpenCaseType,
  onDeleteCaseType,
  isLoading = false,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.page}>
      <header className={css.header}>
        <Title order={2} fw={650}>
          <Trans>Case types</Trans>
        </Title>
        <Text c="dimmed" maw={560}>
          <Trans>Each case type is a kind of record you manage.</Trans>
        </Text>
      </header>
      {isLoading ? (
        <Loader m="md" size="sm" />
      ) : (
        <div className={css.grid}>
          {caseTypes.map((caseType) => {
            return (
              <CaseTypeCard
                key={caseType.id}
                caseType={caseType}
                onOpen={() => {
                  onOpenCaseType(caseType);
                }}
                onDelete={
                  onDeleteCaseType
                    ? () => {
                        onDeleteCaseType(caseType);
                      }
                    : undefined
                }
              />
            );
          })}
          <NewCaseTypeCard onCreate={onCreate} />
        </div>
      )}
    </div>
  );
}
