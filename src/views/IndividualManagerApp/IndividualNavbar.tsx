import { NavLinkList } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Box, BoxProps, Loader, ScrollArea, Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/views/IndividualManagerApp/IndividualNavbar.module.css";
import { useConceptIndividuals } from "@/views/IndividualManagerApp/useConceptIndividuals";
import { useVirtualIndividualLinks } from "@/views/IndividualManagerApp/useVirtualIndividualLinks";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
} & BoxProps;

/**
 * Record list pane for one case type. Same spatial language as Data Sources:
 * raised surface, hairline edge, hover that is actually visible.
 */
export function IndividualNavbar({
  concept,
  className,
  ...boxProps
}: Props): ReactNode {
  const {
    allIndividuals,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useConceptIndividuals(concept.id);
  const { parentRef, individualLinks, listHeight } = useVirtualIndividualLinks({
    concept,
    allIndividuals,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <Box className={clsx(css.pane, className)} {...boxProps}>
      {isLoading ?
        <Loader m="md" size="sm" />
      : allIndividuals.length === 0 ?
        <Box ta="center" py="md">
          <Text>
            <Trans>No records yet</Trans>
          </Text>
        </Box>
      : <ScrollArea viewportRef={parentRef} h="100%" w="100%">
          <NavLinkList
            links={individualLinks}
            pr="md"
            pl="xs"
            gap="xs"
            inactiveHoverColor="neutral.1"
            className={css.list}
            style={{ height: listHeight }}
          />
        </ScrollArea>
      }
    </Box>
  );
}
