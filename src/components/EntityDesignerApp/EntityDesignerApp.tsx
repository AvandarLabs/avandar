import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityNavbar } from "./EntityNavbar";

export function EntityDesignerApp(): JSX.Element {
  const [entities, isLoading] = EntityConfigClient.useGetAll();

  return (
    <Flex>
      <EntityNavbar
        miw={240}
        mih="100dvh"
        entities={entities ?? []}
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
