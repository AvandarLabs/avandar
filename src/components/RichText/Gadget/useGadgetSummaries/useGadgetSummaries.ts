import { formatDate } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import {
  countDashboardTiles,
  findDashboardTile,
} from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  GadgetFact,
  GadgetLinkTarget,
  GadgetSummary,
  GadgetSummaryOptions,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { MessageDescriptor } from "@lingui/core";

const AUDIENCE_LABELS: Readonly<
  Record<Dashboard.Visibility, MessageDescriptor>
> = {
  draft: msg`Draft`,
  workspace: msg`Workspace`,
  public: msg`Public`,
};

function _buildUpdatedFact(updatedAt: string): GadgetFact {
  return {
    label: msg`Updated`,
    value: formatDate(updatedAt, { format: "MMM D" }),
  };
}

function _buildDashboardLink(options: {
  workspaceSlug: string;
  dashboardId: string;
  tileId?: string;
}): GadgetLinkTarget {
  return {
    to: "/$workspaceSlug/dashboards/preview/$dashboardId",
    params: {
      workspaceSlug: options.workspaceSlug,
      dashboardId: options.dashboardId,
    },
    ...(options.tileId ? { search: { tile: options.tileId } } : {}),
  };
}

function _buildChartFacts(
  vizType: AvaVizConfig.Type | undefined,
): GadgetFact[] {
  return vizType === undefined
    ? []
    : [{ label: msg`Chart`, value: vizTypeLabel(vizType) }];
}

/**
 * Whether a fetched gadget row belongs to the current workspace. A stored ref
 * can name any id, so a row another workspace owns must not render as if it
 * were here, under this workspace's slug.
 */
function _isInWorkspace(
  row: { workspaceId: string },
  workspace: { id: string },
): boolean {
  return row.workspaceId === workspace.id;
}

/**
 * Summarizes a dashboard for a gadget chip or card: its tile count, who can
 * see it, and when it last changed. Opens in the dashboard preview.
 */
export function useDashboardSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const { i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const [dashboard, isLoading] = DashboardClient.useGetById({
    id: ref.gadgetId as Dashboard.Id,
  });
  if (isLoading) {
    return { status: "loading" };
  }
  if (!dashboard || !_isInWorkspace(dashboard, workspace)) {
    return { status: "unavailable" };
  }
  return {
    status: "available",
    name: dashboard.name,
    facts: withFacts
      ? [
          {
            label: msg`Tiles`,
            value: String(countDashboardTiles(dashboard.config)),
          },
          {
            label: msg`Audience`,
            value: i18n._(AUDIENCE_LABELS[dashboard.visibility]),
          },
          _buildUpdatedFact(dashboard.updatedAt),
        ]
      : [],
    link: _buildDashboardLink({
      workspaceSlug: workspace.slug,
      dashboardId: dashboard.id,
    }),
  };
}

/**
 * Summarizes one tile of a dashboard for a gadget chip or card, named after
 * its prompt. Unavailable when the dashboard no longer holds the tile. Opens
 * the dashboard preview scrolled to the tile.
 */
export function useDashboardTileSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [dashboard, isLoading] = DashboardClient.useGetById({
    id: ref.gadgetId as Dashboard.Id,
  });
  if (isLoading) {
    return { status: "loading" };
  }
  const tile =
    dashboard && _isInWorkspace(dashboard, workspace) && ref.subId !== null
      ? findDashboardTile(dashboard.config, ref.subId)
      : undefined;
  if (!dashboard || !tile) {
    return { status: "unavailable" };
  }
  return {
    status: "available",
    name: tile.prompt ?? t`Untitled chart`,
    facts: withFacts
      ? [
          { label: msg`Dashboard`, value: dashboard.name },
          ..._buildChartFacts(tile.vizType),
          _buildUpdatedFact(dashboard.updatedAt),
        ]
      : [],
    link: _buildDashboardLink({
      workspaceSlug: workspace.slug,
      dashboardId: dashboard.id,
      tileId: tile.id,
    }),
  };
}

/**
 * Summarizes a dataset for a gadget chip or card: where it came from, how
 * many columns it has, and when it last changed. Opens in Data Sources.
 */
export function useDatasetSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const workspace = useCurrentWorkspace();
  const sourceLabels = useDatasetSourceLabels();
  const [dataset, isLoadingDataset] = DatasetClient.useGetById({
    id: ref.gadgetId as Dataset.Id,
  });
  const [columnCount, isLoadingColumns] = DatasetColumnClient.useGetCount({
    where: { dataset_id: { eq: ref.gadgetId } },
    useQueryOptions: { enabled: withFacts },
  });
  if (isLoadingDataset || isLoadingColumns) {
    return { status: "loading" };
  }
  if (!dataset || !_isInWorkspace(dataset, workspace)) {
    return { status: "unavailable" };
  }
  const appLink = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId: dataset.id,
    datasetName: dataset.name,
  });
  return {
    status: "available",
    name: dataset.name,
    facts: withFacts
      ? [
          { label: msg`Source`, value: sourceLabels[dataset.sourceType] },
          { label: msg`Columns`, value: String(columnCount ?? 0) },
          _buildUpdatedFact(dataset.updatedAt),
        ]
      : [],
    link: { to: appLink.to, params: appLink.params },
  };
}

/**
 * Summarizes a map for a gadget chip or card: its layer count and when it
 * last changed. Opens in the map editor.
 */
export function useMapSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const workspace = useCurrentWorkspace();
  const [map, isLoading] = AvaMapClient.useGetById({
    id: ref.gadgetId as AvaMap.Id,
  });
  if (isLoading) {
    return { status: "loading" };
  }
  if (!map || !_isInWorkspace(map, workspace)) {
    return { status: "unavailable" };
  }
  const appLink = AppLinks.mapEditor({
    workspaceSlug: workspace.slug,
    mapId: map.id,
  });
  return {
    status: "available",
    name: map.name,
    facts: withFacts
      ? [
          { label: msg`Layers`, value: String(map.config.layers.length) },
          _buildUpdatedFact(map.updatedAt),
        ]
      : [],
    link: { to: appLink.to, params: appLink.params },
  };
}

/**
 * Summarizes a case type for a gadget chip or card: how many cases and how
 * many fields it has. Opens the case type's list of cases.
 */
export function useConceptSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const workspace = useCurrentWorkspace();
  const [concept, isLoadingConcept] = ConceptClient.useGetById({
    id: ref.gadgetId as Concept.Id,
  });
  const [recordCount, isLoadingRecords] = IndividualClient.useGetCount({
    where: { concept_id: { eq: ref.gadgetId } },
    useQueryOptions: { enabled: withFacts },
  });
  const [fieldCount, isLoadingFields] = ConceptAttributeClient.useGetCount({
    where: { concept_id: { eq: ref.gadgetId } },
    useQueryOptions: { enabled: withFacts },
  });
  if (isLoadingConcept || isLoadingRecords || isLoadingFields) {
    return { status: "loading" };
  }
  if (!concept || !_isInWorkspace(concept, workspace)) {
    return { status: "unavailable" };
  }
  const appLink = AppLinks.individualManagerHome({
    workspaceSlug: workspace.slug,
    conceptId: concept.id,
    conceptName: concept.name,
  });
  return {
    status: "available",
    name: concept.name,
    facts: withFacts
      ? [
          { label: msg`Records`, value: String(recordCount ?? 0) },
          { label: msg`Fields`, value: String(fieldCount ?? 0) },
        ]
      : [],
    link: { to: appLink.to, params: appLink.params },
  };
}

/**
 * Summarizes a case for a gadget chip or card: its case type and when it
 * last changed. Opens the case's page.
 */
export function useIndividualSummary(
  ref: Gadget.Ref,
  { withFacts }: GadgetSummaryOptions,
): GadgetSummary {
  const workspace = useCurrentWorkspace();
  const [individual, isLoadingIndividual] = IndividualClient.useGetById({
    id: ref.gadgetId as Individual.Id,
  });
  const [concept, isLoadingConcept] = ConceptClient.useGetById({
    id: individual?.conceptId,
    useQueryOptions: { enabled: withFacts && individual !== undefined },
  });
  if (isLoadingIndividual || isLoadingConcept) {
    return { status: "loading" };
  }
  if (!individual || !_isInWorkspace(individual, workspace)) {
    return { status: "unavailable" };
  }
  const appLink = AppLinks.individualManagerIndividualView({
    workspaceSlug: workspace.slug,
    conceptId: individual.conceptId,
    individualId: individual.id,
    individualName: individual.name,
  });
  return {
    status: "available",
    name: individual.name,
    facts: withFacts
      ? [
          ...(concept ? [{ label: msg`Case type`, value: concept.name }] : []),
          _buildUpdatedFact(individual.updatedAt),
        ]
      : [],
    link: { to: appLink.to, params: appLink.params },
  };
}
