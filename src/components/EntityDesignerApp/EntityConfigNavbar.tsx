import { Box, BoxProps, Loader, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
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
  const workspace = useCurrentWorkspace();
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
            workspaceSlug: workspace.slug,
            entityConfigId: entity.id,
            entityConfigName: entity.name,
          }),
          style: borderStyle,
          linkKey: entity.id,
        };
      }),
      {
        to: AppLinks.entityDesignerCreatorView(workspace.slug).to,
        label: "Create new profile type",
        style: borderStyle,
        linkKey: "create-new",
      },
    ];
    return entityConfigLinks;
  }, [entityConfigs, borderStyle, workspace.slug]);

  return (
    <Box bg="neutral.1" pt="0" {...boxProps}>
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
