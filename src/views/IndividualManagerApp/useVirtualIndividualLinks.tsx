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
import type { UserProfile } from "$/models/User/UserProfile";
import type { NavLinkProps } from "@avandar/ui";
import type { CSSProperties, RefObject } from "react";

const ROW_HEIGHT_PX = 64;

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
  /** The workspace's members by user id. `undefined` while they load. */
  membersById: ReadonlyMap<string, UserProfile.WithRole> | undefined;
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
  membersById: ReadonlyMap<string, UserProfile.WithRole> | undefined;
  unassignedText: string;
  formerMemberText: string;
};

/**
 * Who a record is assigned to, as its row's second line. Omitted while the
 * members load, since a name cannot be told from a former member until then.
 */
function _makeAssigneeDescription(
  individual: Individual.T,
  options: Readonly<
    Pick<
      MakeVirtualLinkOptions,
      "membersById" | "unassignedText" | "formerMemberText"
    >
  >,
): string | undefined {
  const { membersById, unassignedText, formerMemberText } = options;
  if (membersById === undefined) {
    return undefined;
  }
  if (!individual.assignedTo) {
    return unassignedText;
  }
  return (
    membersById.get(individual.assignedTo)?.displayName ?? formerMemberText
  );
}

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
    description: _makeAssigneeDescription(individual, options),
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

  const { concept, statusesById, membersById } = options;
  const individualLinks = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      return _makeVirtualLink({
        virtualRow,
        allIndividuals,
        statusesById,
        concept,
        workspaceSlug: workspace.slug,
        loadingText: t`Loading more...`,
        membersById,
        unassignedText: t`Unassigned`,
        formerMemberText: t`Former member`,
      });
    });
  }, [
    virtualRows,
    allIndividuals,
    statusesById,
    membersById,
    concept,
    workspace.slug,
    t,
  ]);

  return {
    parentRef,
    individualLinks,
    listHeight: rowVirtualizer.getTotalSize(),
  };
}
