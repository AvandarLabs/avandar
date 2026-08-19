import { NavLinkList } from "@avandar/ui";
import { constant, prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  BoxProps,
  Flex,
  Loader,
  ScrollArea,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concept: Concept.T;
} & BoxProps;

// TODO(jpsyx): generalize these navbars
export function IndividualNavbar({ concept, ...boxProps }: Props): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const theme = useMantineTheme();
  const borderStyle = useMemo(() => {
    return {
      borderTopRightRadius: theme.radius.md,
      borderBottomRightRadius: theme.radius.md,
    };
  }, [theme.radius]);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: IndividualClient.QueryKeys.getAll(
        where("concept_id", "eq", concept.id),
      ),
      queryFn: (ctx) => {
        return IndividualClient.getPage({
          pageSize: 20,
          pageNum: ctx.pageParam,
          ...where("concept_id", "eq", concept.id),
        });
      },
      getNextPageParam: (lastPage) => {
        return lastPage.nextPage;
      },
      initialPageParam: 0,
    });

  const allIndividuals = useMemo(() => {
    return data ? data.pages.flatMap(prop("rows")) : [];
  }, [data]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    // if `hasNextPage` then add 1 to account for the loader row
    count: hasNextPage ? allIndividuals.length + 1 : allIndividuals.length,
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: constant(50),
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualRows].reverse();
    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= allIndividuals.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualRows,
    allIndividuals.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const individualLinks = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      const isLoaderRow = virtualRow.index > allIndividuals.length - 1;
      const style = {
        position: "absolute" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        ...borderStyle,
      };

      if (isLoaderRow) {
        return {
          style,
          loadingText:
            hasNextPage ? t`Loading more...` : t`Nothing more to load`,
        };
      }

      const individual = allIndividuals[virtualRow.index];
      if (!individual) {
        return undefined;
      }

      const appLink = AppLinks.individualManagerIndividualView({
        workspaceSlug: workspace.slug,
        conceptId: concept.id,
        individualId: individual.id,
        individualName: individual.name,
      });
      return {
        ...appLink,
        label: appLink.label(),
        style,
      };
    });
  }, [
    virtualRows,
    concept,
    allIndividuals,
    borderStyle,
    hasNextPage,
    workspace.slug,
    t,
  ]);

  return (
    <Flex bg="neutral.1" pt="lg" direction="column" {...boxProps}>
      <Title pl="sm" order={3} pb="sm">
        <Trans>{concept.name} Manager</Trans>
      </Title>

      <ScrollArea viewportRef={parentRef} flex={1} mih={0}>
        <NavLinkList
          pt="md"
          links={individualLinks}
          pr="md"
          inactiveHoverColor="neutral.1"
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative",
          }}
        />
      </ScrollArea>
      {isFetchingNextPage ?
        <Loader />
      : null}
    </Flex>
  );
}
