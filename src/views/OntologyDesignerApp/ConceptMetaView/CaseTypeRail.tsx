import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  /** The datasets its records come from. Unset while they load. */
  datasets: readonly Dataset.T[] | undefined;
};

/**
 * Reference facts about a case type: the datasets its records come from,
 * whether records may be added by hand, who owns it, and when it was made.
 * A fact with no value is omitted.
 */
export function CaseTypeRail({
  concept,
  datasets,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [members] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: workspace.id,
  });
  const owner = members?.find((member) => {
    return member.userId === concept.ownerId;
  });

  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Case type</Trans>}>
        {datasets && datasets.length > 0 ? (
          <AppViewRail.Fact label={t`Source data`}>
            <Stack component="span" gap={2}>
              {datasets.map((dataset) => {
                return <span key={dataset.id}>{dataset.name}</span>;
              })}
            </Stack>
          </AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Records added by hand`}>
          {concept.allowManualCreation ? t`Allowed` : t`Not allowed`}
        </AppViewRail.Fact>
        {owner ? (
          <AppViewRail.Fact label={t`Owner`}>
            {owner.displayName}
          </AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Created`}>
          {formatDate(concept.createdAt, { format: "MMM D, YYYY" })}
        </AppViewRail.Fact>
      </AppViewRail.Group>
    </AppViewRail>
  );
}
