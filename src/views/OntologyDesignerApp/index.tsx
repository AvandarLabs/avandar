import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Flex, ScrollArea } from "@mantine/core";
import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ConceptNavbar } from "@/views/OntologyDesignerApp/ConceptNavbar";
import { NewCaseTypeButton } from "@/views/OntologyDesignerApp/NewCaseTypeButton";

/**
 * Case Manager workspace. The index is a card grid; concept and creator
 * routes use a list pane plus a detail outlet.
 */
export function OntologyDesignerApp(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const matchRoute = useMatchRoute();
  const isCreatorRoute = Boolean(
    matchRoute({ to: "/$workspaceSlug/ontology-designer/concept-creator" }),
  );
  const isConceptRoute = Boolean(
    matchRoute({ to: "/$workspaceSlug/ontology-designer/$conceptId" }),
  );
  const showMasterDetail = isCreatorRoute || isConceptRoute;
  const [concepts, isLoading] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const caseTypes = concepts ?? [];

  return (
    <AppLayout
      title={t`Case Manager`}
      toolbarButtonSection={<NewCaseTypeButton />}
      containerProps={showMasterDetail ? undefined : { p: "md" }}
    >
      {showMasterDetail ? (
        <Flex align="stretch" h="100%">
          {caseTypes.length > 0 || isLoading ? (
            <ConceptNavbar
              miw={240}
              concepts={caseTypes}
              isLoading={isLoading}
            />
          ) : null}
          <ScrollArea h="100%" w="100%">
            <Outlet />
          </ScrollArea>
        </Flex>
      ) : (
        <Outlet />
      )}
    </AppLayout>
  );
}
