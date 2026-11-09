import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import {
  extractSavedDashboardTile,
  extractSavedDashboardTiles,
} from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/extractDashboardTiles";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Loads what the agent may learn about mentioned and attached gadgets. */
export type AgentGadgetContextLoader = {
  /** Each ref's context, keyed by `ChatMentionToken.buildRefKey`. */
  load: (
    refs: readonly Gadget.Ref[],
  ) => Promise<Map<string, AgentGadgetContext>>;
};

/** `Omit` applied to each variant of a union, so each keeps its keys. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A context without its ref, which `_loadOne` adds. */
type Loaded = DistributiveOmit<AgentGadgetContext, "ref"> | undefined;

type InWorkspace = <T extends { workspaceId: string }>(
  row: T | undefined,
) => T | undefined;

async function _loadDashboard(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<Loaded> {
  const dashboard = inWorkspace(
    await DashboardClient.getById({ id: ref.gadgetId as Dashboard.Id }),
  );
  if (!dashboard) {
    return undefined;
  }
  if (ref.subId === null) {
    return {
      kind: "dashboard",
      name: dashboard.name,
      tiles: extractSavedDashboardTiles(dashboard.config),
    };
  }
  const tile = extractSavedDashboardTile(dashboard.config, ref.subId);
  return tile
    ? { kind: "dashboard_tile", dashboardName: dashboard.name, tile }
    : undefined;
}

async function _loadDataset(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<Loaded> {
  const dataset = inWorkspace(
    await DatasetClient.getById({ id: ref.gadgetId as Dataset.Id }),
  );
  return dataset ? { kind: "dataset", name: dataset.name } : undefined;
}

async function _loadMap(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<Loaded> {
  const map = inWorkspace(
    await AvaMapClient.getById({ id: ref.gadgetId as AvaMap.Id }),
  );
  if (!map) {
    return undefined;
  }
  return {
    kind: "map",
    name: map.name,
    layers: map.config.layers.map((layer) => {
      const sourceName = layer.source.dataSource?.name;
      return sourceName
        ? { name: layer.name, sourceName }
        : { name: layer.name };
    }),
  };
}

async function _loadConcept(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<Loaded> {
  const concept = inWorkspace(
    await ConceptClient.getById({ id: ref.gadgetId as Concept.Id }),
  );
  if (!concept) {
    return undefined;
  }
  const fields = await ConceptAttributeClient.getAll({
    where: { concept_id: { eq: concept.id } },
  });
  return {
    kind: "concept",
    name: concept.name,
    fieldNames: fields.map((field) => {
      return field.name;
    }),
  };
}

function _loadByType(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<Loaded> {
  switch (ref.gadgetType) {
    case "dashboard":
    case "dashboard_tile":
      return _loadDashboard(ref, inWorkspace);
    case "dataset":
      return _loadDataset(ref, inWorkspace);
    case "map":
      return _loadMap(ref, inWorkspace);
    case "concept":
      return _loadConcept(ref, inWorkspace);
    case "individual":
      return Promise.resolve(undefined);
  }
}

async function _loadOne(
  ref: Gadget.Ref,
  inWorkspace: InWorkspace,
): Promise<AgentGadgetContext> {
  try {
    const loaded = await _loadByType(ref, inWorkspace);
    return loaded
      ? ({ ...loaded, ref } as AgentGadgetContext)
      : { kind: "unavailable", ref };
  } catch {
    return { kind: "unavailable", ref };
  }
}

/**
 * Loads mentioned and attached gadgets with the user's own session, so RLS
 * decides what the agent may learn. A row from another workspace counts as
 * missing, as in the gadget summaries: a token can name any uuid. A gadget
 * that is missing, restricted, a removed tile, or fails to load comes back
 * `unavailable` rather than failing the turn. Cases are never loaded.
 */
export function createAgentGadgetContextLoader(
  workspaceId: Workspace.Id,
): AgentGadgetContextLoader {
  const inWorkspace: InWorkspace = (row) => {
    return row?.workspaceId === workspaceId ? row : undefined;
  };
  return {
    load: async (refs) => {
      const uniqueRefs = new Map(
        refs.map((ref) => {
          return [ChatMentionToken.buildRefKey(ref), ref] as const;
        }),
      );
      const entries = await Promise.all(
        [...uniqueRefs].map(async ([key, ref]) => {
          return [key, await _loadOne(ref, inWorkspace)] as const;
        }),
      );
      return new Map(entries);
    },
  };
}
