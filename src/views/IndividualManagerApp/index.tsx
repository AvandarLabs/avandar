import type { Concept } from "$/models/ontology/Concept/Concept";

import { Flex, ScrollArea } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";

import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { EditCaseTypeButton } from "@/views/IndividualManagerApp/EditCaseTypeButton";
import { IndividualNavbar } from "@/views/IndividualManagerApp/IndividualNavbar";

type Props = {
  concept: Concept.T;
};

/**
 * Records workspace for one case type: list pane plus a detail outlet,
 * on the same AppLayout canvas as Data Sources.
 */
export function IndividualManagerApp({ concept }: Props): JSX.Element {
  return (
    <AppLayout
      title={concept.name}
      toolbarButtonSection={<EditCaseTypeButton concept={concept} />}
    >
      <Flex align="stretch" h="100%">
        <IndividualNavbar concept={concept} miw={240} />
        <ScrollArea h="100%" w="100%">
          <Outlet />
        </ScrollArea>
      </Flex>
    </AppLayout>
  );
}
