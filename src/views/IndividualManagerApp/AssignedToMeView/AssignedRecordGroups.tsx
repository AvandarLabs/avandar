import { NavLinkList } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { CaseTypeRecordGroup } from "@/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType";
import type { NavLinkProps } from "@avandar/ui";
import type { ReactNode } from "react";

type Props = {
  groups: readonly CaseTypeRecordGroup[];
  conceptsById: ReadonlyMap<Concept.Id, Concept.T>;
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onShowMore: () => unknown;
};

/**
 * One row of the queue: the record's name, its status dot when its status is
 * known, and a link to the record. The dot's status name is its accessible
 * name, so color is never the only signal.
 */
function _makeRecordLink(options: {
  workspaceSlug: string;
  record: Individual.T;
  statusesById: Props["statusesById"];
}): NavLinkProps & { key: string } {
  const { workspaceSlug, record, statusesById } = options;
  const status = statusesById.get(record.statusId);
  const appLink = AppLinks.individualManagerIndividualView({
    workspaceSlug,
    conceptId: record.conceptId,
    individualId: record.id,
    individualName: record.name,
  });

  return {
    ...appLink,
    label: appLink.label(),
    leftSection: status ? (
      <StatusDot color={status.color} label={status.name} />
    ) : undefined,
  };
}

/** One case type's section, listing its loaded records. */
function AssignedCaseTypeSection({
  group,
  concept,
  statusesById,
}: Readonly<{
  group: CaseTypeRecordGroup;
  concept: Concept.T | undefined;
  statusesById: Props["statusesById"];
}>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();

  return (
    <AppViewSection
      title={concept?.name ?? t`Case type`}
      meta={String(group.records.length)}
    >
      <NavLinkList
        gap="xs"
        links={group.records.map((record) => {
          return _makeRecordLink({
            workspaceSlug: workspace.slug,
            record,
            statusesById,
          });
        })}
      />
    </AppViewSection>
  );
}

/** One section per case type, then Show more while another page exists. */
export function AssignedRecordGroups({
  groups,
  conceptsById,
  statusesById,
  hasNextPage,
  isFetchingNextPage,
  onShowMore,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xl">
      {groups.map((group) => {
        return (
          <AssignedCaseTypeSection
            key={group.conceptId}
            group={group}
            concept={conceptsById.get(group.conceptId)}
            statusesById={statusesById}
          />
        );
      })}
      {hasNextPage ? (
        <Button
          variant="default"
          size="compact-sm"
          w="fit-content"
          loading={isFetchingNextPage}
          onClick={onShowMore}
        >
          <Trans>Show more</Trans>
        </Button>
      ) : null}
    </Stack>
  );
}
