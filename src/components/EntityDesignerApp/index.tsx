import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { where } from "@/lib/utils/filters/filters";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityConfigNavbar } from "./EntityConfigNavbar";

export function EntityDesignerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [entities, isLoading] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return (
    <Flex>
      <EntityConfigNavbar
        miw={240}
        mih="100dvh"
        entityConfigs={entities ?? []}
        isLoading={isLoading}
        style={$entityNavbarBorder}
      />
      <Box flex={1}>
        <Outlet />
      </Box>
    </Flex>
  );
}

const $entityNavbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
  };
};
