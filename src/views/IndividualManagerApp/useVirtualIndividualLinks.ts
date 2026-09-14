import { constant } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { NavLinkProps } from "@avandar/ui";
import type { CSSProperties, RefObject } from "react";

const ROW_HEIGHT_PX = 50;

type VirtualLink =
  | (NavLinkProps & { key: string; style: CSSProperties })
  | { loadingText: string; style: CSSProperties }
  | undefined;

type Options = {
  concept: Concept.T;
  allIndividuals: readonly Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Virtualized nav rows for a case type's records, including the trailing
 * loader row when another page exists.
 */
export function useVirtualIndividualLinks({
  concept,
  allIndividuals,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Options): {
  parentRef: RefObject<HTMLDivElement | null>;
  individualLinks: VirtualLink[];
  listHeight: number;
} {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowCount = hasNextPage
    ? allIndividuals.length + 1
    : allIndividuals.length;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: constant(ROW_HEIGHT_PX),
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (
      lastItem &&
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
      return makeVirtualLink({
        virtualRow,
        allIndividuals,
        concept,
        workspaceSlug: workspace.slug,
        hasNextPage,
        loadingMoreText: t`Loading more...`,
        nothingMoreText: t`Nothing more to load`,
      });
    });
  }, [virtualRows, allIndividuals, concept, hasNextPage, workspace.slug, t]);

  return {
    parentRef,
    individualLinks,
    listHeight: rowVirtualizer.getTotalSize(),
  };
}

function makeVirtualLink(options: {
  virtualRow: { index: number; size: number; start: number };
  allIndividuals: readonly Individual.T[];
  concept: Concept.T;
  workspaceSlug: string;
  hasNextPage: boolean;
  loadingMoreText: string;
  nothingMoreText: string;
}): VirtualLink {
  const {
    virtualRow,
    allIndividuals,
    concept,
    workspaceSlug,
    hasNextPage,
    loadingMoreText,
    nothingMoreText,
  } = options;
  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: `${virtualRow.size}px`,
    transform: `translateY(${virtualRow.start}px)`,
  };
  if (virtualRow.index > allIndividuals.length - 1) {
    return {
      style,
      loadingText: hasNextPage ? loadingMoreText : nothingMoreText,
    };
  }
  const individual = allIndividuals[virtualRow.index];
  if (!individual) {
    return undefined;
  }
  const appLink = AppLinks.individualManagerIndividualView({
    workspaceSlug,
    conceptId: concept.id,
    individualId: individual.id,
    individualName: individual.name,
  });
  return { ...appLink, label: appLink.label(), style };
}
