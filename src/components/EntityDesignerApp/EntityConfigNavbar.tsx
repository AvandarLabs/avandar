import { Box, BoxProps, Loader, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { EntityConfig } from "@/models/EntityConfig/types";
import { getEntityConfigLinkProps } from "@/models/EntityConfig/utils";

type Props = {
  entityConfigs: readonly EntityConfig[];
  isLoading: boolean;
} & BoxProps;

export function EntityConfigNavbar({
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

  const entityLinks = useMemo(() => {
    const entityConfigLinks = [
      ...entityConfigs.map((entity) => {
        return {
          ...getEntityConfigLinkProps(entity),
          label: entity.name,
          style: borderStyle,
          linkKey: entity.id,
        };
      }),
      {
        to: AppConfig.links.entityCreator.to,
        label: "Create new profile type",
        style: borderStyle,
        linkKey: "create-new",
      },
    ];
    return entityConfigLinks;
  }, [entityConfigs, borderStyle]);

  return (
    <Box bg="neutral.0" pt="0" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <NavLinkList
        pt="md"
        links={entityLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />
    </Box>
  );
}
