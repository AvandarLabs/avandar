import { where } from "@avandar/utils";
import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ConceptNavbar } from "@/views/OntologyDesignerApp/ConceptNavbar";

export function OntologyDesignerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [individuals, isLoading] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return (
    <Flex>
      <ConceptNavbar
        miw={240}
        mih="100dvh"
        concepts={individuals ?? []}
        isLoading={isLoading}
        style={$individualNavbarBorder}
      />
      <Box flex={1}>
        <Outlet />
      </Box>
    </Flex>
  );
}

const $individualNavbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
  };
};
