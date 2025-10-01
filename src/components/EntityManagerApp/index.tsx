import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig.types";
import { EntityNavbar } from "./EntityNavbar";

type Props = {
  entityConfig: EntityConfig;
};

export function EntityManagerApp({ entityConfig }: Props): JSX.Element {
  return (
    <Flex>
      <EntityNavbar
        entityConfig={entityConfig}
        miw={240}
        mih="100dvh"
        h="100dvh"
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
