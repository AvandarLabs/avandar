import { NavLinkList } from "@avandar/ui";
import { Box, BoxProps, Loader, ScrollArea } from "@mantine/core";
import clsx from "clsx";
import { useMemo } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/OntologyDesignerApp/ConceptNavbar.module.css";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concepts: readonly Concept.T[];
  isLoading: boolean;
} & BoxProps;

/**
 * Case-type list pane. Matches the Data Sources dataset list: raised surface,
 * hairline divider, visible hover on inactive rows.
 */
export function ConceptNavbar({
  concepts,
  isLoading,
  className,
  ...boxProps
}: Props): ReactNode {
  const workspace = useCurrentWorkspace();

  const conceptLinks = useMemo(() => {
    return concepts.map((concept) => {
      const appLink = AppLinks.ontologyDesignerConceptView({
        workspaceSlug: workspace.slug,
        conceptId: concept.id,
        conceptName: concept.name,
      });
      return {
        ...appLink,
        label: appLink.label(),
      };
    });
  }, [concepts, workspace.slug]);

  return (
    <Box className={clsx(css.pane, className)} {...boxProps}>
      {isLoading ?
        <Loader m="md" size="sm" />
      : <ScrollArea h="100%" w="100%">
          <NavLinkList
            pt="md"
            links={conceptLinks}
            pr="md"
            pl="xs"
            gap="xs"
            inactiveHoverColor="neutral.1"
          />
        </ScrollArea>
      }
    </Box>
  );
}
