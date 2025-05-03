import { Box, BoxProps, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { type NavLinkProps } from "@/lib/ui/links/NavLink";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { EntityRead } from "@/models/Entity/EntityClient";
import { getEntityLinkProps } from "@/models/Entity/utils";
import { EntityConfig } from "@/models/EntityConfig/types";

type Props = {
  entityConfig: EntityConfig;
  entities: readonly EntityRead[];
  isLoading: boolean;
} & BoxProps;

// TODO(pablo): generalize these navbars
export function EntityNavbar({
  entityConfig,
  entities,
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
    return entities
      .map((entity): NavLinkProps => {
        return {
          ...getEntityLinkProps({ entityConfig, entity }),
          // TODO(pablo): this label should come from the field
          // that is configured as the title field
          label: entity.externalId,
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
  }, [entityConfig, entities, borderStyle]);

  return (
    <Box bg="neutral.0" pt="lg" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <Title pl="sm" order={3}>
        {entityConfig.name} Manager
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
