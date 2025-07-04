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
import { useEffect, useMemo, useRef } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspaceSlug } from "@/lib/hooks/workspaces/useCurrentWorkspaceSlug";
import { NavLinkList } from "@/lib/ui/links/NavLinkList";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityClient } from "@/models/Entity/EntityClient";
import { EntityConfig } from "@/models/EntityConfig/types";

type Props = {
  entityConfig: EntityConfig;
} & BoxProps;

// TODO(jpsyx): generalize these navbars
export function EntityNavbar({
  entityConfig,
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

  const entityClient = EntityClient.ofType(entityConfig.id);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: entityClient.QueryKeys.getAll(),
      queryFn: (ctx) => {
        return entityClient.getPage({
          pageSize: 20,
          pageNum: ctx.pageParam,
        });
      },
      getNextPageParam: (lastPage) => {
        return lastPage.nextPage;
      },
      initialPageParam: 0,
    });

  const allEntities = useMemo(() => {
    return data ? data.pages.flatMap(getProp("rows")) : [];
  }, [data]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    // if `hasNextPage` then add 1 to account for the loader row
    count: hasNextPage ? allEntities.length + 1 : allEntities.length,
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
      lastItem.index >= allEntities.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualRows,
    allEntities.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const entityLinks = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      const isLoaderRow = virtualRow.index > allEntities.length - 1;
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
          loadingText: hasNextPage ? "Loading more..." : "Nothing more to load",
        };
      }

      const entity = allEntities[virtualRow.index];
      if (!entity) {
        return undefined;
      }

      return {
        ...AppLinks.entityManagerEntityView({
          workspaceSlug,
          entityConfigId: entityConfig.id,
          entityId: entity.id,
          entityName: entity.name,
        }),
        linkKey: entity.id,
        style,
      };
    });
  }, [virtualRows, entityConfig, allEntities, borderStyle, hasNextPage]);

  return (
    <Flex bg="neutral.0" pt="lg" direction="column" {...boxProps}>
      <Title pl="sm" order={3} pb="sm">
        {entityConfig.name} Manager
      </Title>

      <ScrollArea viewportRef={parentRef} flex={1} mih={0}>
        <NavLinkList
          pt="md"
          links={entityLinks}
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
