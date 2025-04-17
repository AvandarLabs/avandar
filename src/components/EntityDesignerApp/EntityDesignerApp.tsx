import { Box, Flex, MantineTheme } from "@mantine/core";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import {
  EntityConfig,
  EntityConfigQueryKeys,
} from "@/models/EntityConfig/EntityConfig";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityNavbar } from "./EntityNavbar";

function useEntities(): [
  EntityConfig[] | undefined,
  boolean,
  UseQueryResult<EntityConfig[]>,
] {
  const queryResultObj = useQuery({
    queryKey: [EntityConfigQueryKeys.allEntityConfigs],
    queryFn: async () => {
      const entities = await EntityConfigClient.getAll();
      return entities;
    },
  });
  return [queryResultObj.data, queryResultObj.isLoading, queryResultObj];
}

export function EntityDesignerApp(): JSX.Element {
  const [entities, isLoading] = useEntities();

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
