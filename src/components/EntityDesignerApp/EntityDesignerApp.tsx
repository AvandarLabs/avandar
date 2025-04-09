import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { EntityNavbar } from "./EntityNavbar";

export function EntityDesignerApp(): JSX.Element {
  const allEntities = ["Entity 1", "Entity 2"];

  return (
    <Flex>
      <EntityNavbar
        miw={240}
        mih="100dvh"
        entities={allEntities}
        isLoading={false}
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
