import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Flex, ScrollArea } from "@mantine/core";
import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
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
  // `$conceptId` also matches the creator's path segment, so the creator is
  // excluded by name. The case type page is an `AppView`, which scrolls its
  // own body so its header band stays put; the creator form still scrolls
  // as a whole.
  const isCaseTypeRoute = isConceptRoute && !isCreatorRoute;
  const [concepts, isLoading] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const caseTypes = concepts ?? [];

  return (
    <AppSlate
      title={t`Case Manager`}
      toolbarButtonSection={<NewCaseTypeButton />}
      containerProps={showMasterDetail ? undefined : { p: "md" }}
    >
      {showMasterDetail ? (
        <Flex align="stretch" h="100%" mih={0}>
          {caseTypes.length > 0 || isLoading ? (
            <ConceptNavbar
              miw={240}
              concepts={caseTypes}
              isLoading={isLoading}
            />
          ) : null}
          {isCaseTypeRoute ? (
            <Flex direction="column" flex={1} miw={0} mih={0}>
              <Outlet />
            </Flex>
          ) : (
            <ScrollArea h="100%" w="100%">
              <Outlet />
            </ScrollArea>
          )}
        </Flex>
      ) : (
        <Outlet />
      )}
    </AppSlate>
  );
}
