import { Box, BoxProps, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { type NavLinkProps } from "@/lib/ui/links/NavLink";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import {
  EntityConfig,
  getEntityConfigLinkProps,
} from "@/models/EntityConfig/EntityConfig";

type Props = {
  entityConfigs: EntityConfig[];
  isLoading: boolean;
} & BoxProps;

export function EntityNavbar({
  entityConfigs,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const entityLinks: readonly NavLinkProps[] = useMemo(() => {
    return entityConfigs
      .map((entity): NavLinkProps => {
        return {
          ...getEntityConfigLinkProps(entity),
          label: entity.name,
          style: borderStyle,
        };
      })
      .concat([
        {
          to: APP_CONFIG.links.entityCreator.to,
          label: "Create new entity",
          style: borderStyle,
        },
      ] as NavLinkProps[]);
  }, [entityConfigs, borderStyle]);

  return (
    <Box bg="neutral.0" pt="lg" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <Title pl="sm" order={3}>
        Entities
      </Title>
      <NavLinkList
        pt="md"
        links={entityLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />
    </Box>
  );
}
