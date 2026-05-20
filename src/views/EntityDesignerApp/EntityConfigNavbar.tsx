import { useLingui } from "@lingui/react/macro";
import { Box, BoxProps, Loader, useMantineTheme } from "@mantine/core";
import { NavLinkList } from "@ui";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";

type Props = {
  entityConfigs: readonly EntityConfig.T[];
  isLoading: boolean;
} & BoxProps;

export function EntityConfigNavbar({
  entityConfigs,
  isLoading,
  ...boxProps
}: Props): JSX.Element {
  const { t } = useLingui();
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
        };
      }),
      {
        to: AppLinks.entityDesignerCreatorView(workspace.slug).to,
        label: t`Create new profile type`,
        style: borderStyle,
        key: "create-new",
      },
    ];
    return entityConfigLinks;
  }, [entityConfigs, borderStyle, workspace.slug, t]);

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
