import { Flex } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { EditCaseTypeButton } from "@/views/IndividualManagerApp/EditCaseTypeButton";
import { IndividualNavbar } from "@/views/IndividualManagerApp/IndividualNavbar/IndividualNavbar";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concept: Concept.T;
};

/**
 * Records workspace for one case type: list pane plus a detail outlet,
 * on the same slate as Data Sources.
 */
export function IndividualManagerApp({ concept }: Props): JSX.Element {
  return (
    <AppSlate
      title={concept.name}
      toolbarButtonSection={<EditCaseTypeButton concept={concept} />}
    >
      {
        // Not a scroll container: the record page's AppViewBody scrolls, so
        // its header band stays put while the content moves under it. The
        // list pane is keyed by case type so its status filter starts empty
        // for each one: the route keeps this component mounted when only the
        // case type in the URL changes.
      }
      <Flex align="stretch" h="100%" mih={0}>
        <IndividualNavbar key={concept.id} concept={concept} />
        <Flex direction="column" flex={1} miw={0} mih={0}>
          <Outlet />
        </Flex>
      </Flex>
    </AppSlate>
  );
}
