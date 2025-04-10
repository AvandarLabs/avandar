import { Box, BoxProps, Loader, Title, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import { Logger } from "@/lib/Logger";
import { type NavLinkProps } from "@/lib/ui/links/NavLink";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";

type Props = {
  entities: string[];
  isLoading: boolean;
} & BoxProps;

function getEntityLinkProps(_entity: string): NavLinkProps {
  Logger.error("Not implemented: getEntityLinkProps");
  return {} as NavLinkProps;
}

export function EntityNavbar({
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
          ...getEntityLinkProps(entity),
          label: entity,
          style: borderStyle,
        };
      })
      .concat([
        {
          to: AppConfig.links.entityCreator.to,
          label: "Create new entity",
          style: borderStyle,
        },
      ] as NavLinkProps[]);
  }, [entities, borderStyle]);

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
