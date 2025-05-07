import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { EntityClient } from "@/models/Entity/EntityClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import { EntityNavbar } from "./EntityNavbar";

type Props = {
  entityConfig: EntityConfig;
};

export function EntityManagerApp({ entityConfig }: Props): JSX.Element {
  const [entities, isLoading] = EntityClient.useGetAll({
    entityConfigId: entityConfig.id,
  });

  return (
    <Flex>
      <EntityNavbar
        entityConfig={entityConfig}
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
