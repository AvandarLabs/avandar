import type { CaseTypeHomeItem } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome";
import type { ReactNode } from "react";

import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { CaseTypeHome } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/",
)({
  component: OntologyDesignerRoot,
});

/**
 * Case Manager home: a grid of case types, including first-run with only
 * the create card.
 */
function OntologyDesignerRoot(): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const dispatch = ChatPanelStateManager.useDispatch();
  const [concepts, isLoading] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [sendDelete] = ConceptClient.useDelete({
    queriesToInvalidate: [ConceptClient.QueryKeys.getAll()],
  });

  // Deleting a case type discards its attributes and mappings, so it is
  // confirmed rather than done on a single click of a hover control. The card
  // model carries a plain string id, so the concept it names is looked up here
  // to recover the typed id the delete needs.
  const confirmDeleteCaseType = (caseType: CaseTypeHomeItem): void => {
    const concept = concepts?.find((candidate) => {
      return candidate.id === caseType.id;
    });
    if (!concept) {
      return;
    }
    modals.openConfirmModal({
      title: t`Delete case type`,
      children: (
        <Text>
          <Trans>
            Are you sure you want to delete {caseType.name}? This cannot be
            undone.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        sendDelete(
          { id: concept.id },
          {
            onSuccess: () => {
              notifications.show({
                title: t`Case type deleted`,
                message: t`${caseType.name} deleted successfully`,
                color: "green",
              });
            },
          },
        );
      },
    });
  };

  if (isLoading) {
    return <Loader m="md" size="sm" />;
  }

  return (
    <CaseTypeHome
      caseTypes={concepts ?? []}
      onCreate={dispatch.beginCaseDesign}
      onDeleteCaseType={confirmDeleteCaseType}
      onOpenCaseType={(caseType) => {
        navigate(
          AppLinks.ontologyDesignerConceptView({
            workspaceSlug: workspace.slug,
            conceptId: caseType.id,
            conceptName: caseType.name,
          }),
        );
      }}
    />
  );
}
