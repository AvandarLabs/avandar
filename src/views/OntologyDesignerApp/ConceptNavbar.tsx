import { NavLinkList } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Box, BoxProps, Loader, useMantineTheme } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concepts: readonly Concept.T[];
  isLoading: boolean;
} & BoxProps;

export function ConceptNavbar({
  concepts,
  isLoading,
  ...boxProps
}: Props): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const individualLinks = useMemo(() => {
    const conceptLinks = [
      ...concepts.map((individual) => {
        const appLink = AppLinks.ontologyDesignerConceptView({
          workspaceSlug: workspace.slug,
          conceptId: individual.id,
          conceptName: individual.name,
        });
        return {
          ...appLink,
          label: appLink.label(),
          style: borderStyle,
        };
      }),
      {
        to: AppLinks.ontologyDesignerCreatorView(workspace.slug).to,
        label: t`Create new profile type`,
        style: borderStyle,
        key: "create-new",
      },
    ];
    return conceptLinks;
  }, [concepts, borderStyle, workspace.slug, t]);

  return (
    <Box bg="neutral.1" pt="0" {...boxProps}>
      {isLoading ?
        <Loader />
      : null}
      <NavLinkList
        pt="md"
        links={individualLinks}
        pr="md"
        inactiveHoverColor="neutral.1"
      />
    </Box>
  );
}
