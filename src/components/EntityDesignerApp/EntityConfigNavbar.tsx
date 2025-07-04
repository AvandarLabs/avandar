import { Box, BoxProps, Loader, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspaceSlug } from "@/lib/hooks/workspaces/useCurrentWorkspaceSlug";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { EntityConfig } from "@/models/EntityConfig/types";

type Props = {
  entityConfigs: readonly EntityConfig[];
  isLoading: boolean;
} & BoxProps;

export function EntityConfigNavbar({
  entityConfigs,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const workspaceSlug = useCurrentWorkspaceSlug();
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
          ...AppLinks.entityDesignerConfigView({
            workspaceSlug,
            entityConfigId: entity.id,
            entityConfigName: entity.name,
          }),
          style: borderStyle,
          linkKey: entity.id,
        };
      }),
      {
        to: AppLinks.entityDesignerCreatorView(workspaceSlug).to,
        label: "Create new profile type",
        style: borderStyle,
        linkKey: "create-new",
      },
    ];
    return entityConfigLinks;
  }, [entityConfigs, borderStyle, workspaceSlug]);

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
