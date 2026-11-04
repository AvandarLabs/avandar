import { constant } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { NavLinkProps } from "@avandar/ui";
import type { CSSProperties, RefObject } from "react";

const ROW_HEIGHT_PX = 50;

/**
 * One row of the virtualized records list: a record link, the trailing
 * loader row while another page exists, or nothing for a row whose record
 * has not arrived.
 */
export type VirtualIndividualLink =
  | (NavLinkProps & { key: string; style: CSSProperties })
  | { loadingText: string; style: CSSProperties }
  | undefined;

type Options = {
  concept: Concept.T;
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
  allIndividuals: readonly Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

type MakeVirtualLinkOptions = {
  virtualRow: { index: number; size: number; start: number };
  allIndividuals: readonly Individual.T[];
  statusesById: ReadonlyMap<ConceptStatus.Id, ConceptStatus.T>;
  concept: Concept.T;
  workspaceSlug: string;
  loadingText: string;
};

function _makeVirtualLink(
  options: Readonly<MakeVirtualLinkOptions>,
): VirtualIndividualLink {
  const { virtualRow, allIndividuals, statusesById, concept } = options;
  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: `${virtualRow.size}px`,
    transform: `translateY(${virtualRow.start}px)`,
  };
  if (virtualRow.index >= allIndividuals.length) {
    return { style, loadingText: options.loadingText };
  }
  const individual = allIndividuals[virtualRow.index];
  if (!individual) {
    return undefined;
  }
  const status = statusesById.get(individual.statusId);
  const appLink = AppLinks.individualManagerIndividualView({
    workspaceSlug: options.workspaceSlug,
    conceptId: concept.id,
    individualId: individual.id,
    individualName: individual.name,
  });
  return {
    ...appLink,
    label: appLink.label(),
    // The dot is the row's only mark of its status, so it is announced by
    // the status name.
    leftSection: status ? (
      <StatusDot color={status.color} label={status.name} />
    ) : undefined,
    style,
  };
}

/**
 * Virtualized nav rows for a case type's records, each marked with its
 * status color, plus the trailing loader row while another page exists.
 *
 * Attach `parentRef` to the element the list scrolls inside.
 */
export function useVirtualIndividualLinks(options: Readonly<Options>): {
  parentRef: RefObject<HTMLDivElement | null>;
  individualLinks: VirtualIndividualLink[];
  listHeight: number;
} {
  const { allIndividuals, hasNextPage, isFetchingNextPage, fetchNextPage } =
    options;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allIndividuals.length + 1 : allIndividuals.length,
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

  const { concept, statusesById } = options;
  const individualLinks = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      return _makeVirtualLink({
        virtualRow,
        allIndividuals,
        statusesById,
        concept,
        workspaceSlug: workspace.slug,
        loadingText: t`Loading more...`,
      });
    });
  }, [virtualRows, allIndividuals, statusesById, concept, workspace.slug, t]);

  return {
    parentRef,
    individualLinks,
    listHeight: rowVirtualizer.getTotalSize(),
  };
}
