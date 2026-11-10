import { createFileRoute, notFound } from "@tanstack/react-router";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { GisApp } from "@/views/GisApp/GisApp";
import { resolveRenderJitterSalt } from "@/views/GisApp/layers/resolveRenderJitterSalt/resolveRenderJitterSalt";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

/**
 * Loads and renders the selected persisted map with the salt that displaces
 * its jittered points: the map's own for an editor, a throwaway otherwise.
 */
export const Route = createFileRoute("/_auth/$workspaceSlug/map/$mapId")({
  loader: async ({
    params,
  }): Promise<{ avaMap: AvaMap.T; jitterSalt: string }> => {
    const mapId = params.mapId as AvaMap.Id;
    const [avaMap, mapJitterSalt] = await Promise.all([
      AvaMapClient.getById({ id: mapId }),
      AvaMapClient.getJitterSalt({ mapId }),
    ]);

    if (!avaMap) {
      throw notFound();
    }

    return { avaMap, jitterSalt: resolveRenderJitterSalt(mapJitterSalt) };
  },
  component: MapEditorPage,
});

function MapEditorPage(): ReactNode {
  const { avaMap, jitterSalt } = Route.useLoaderData();
  return <GisApp key={avaMap.id} avaMap={avaMap} jitterSalt={jitterSalt} />;
}
