import { createFileRoute, notFound } from "@tanstack/react-router";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { GisApp } from "@/views/GisApp/GisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

/** Loads and renders the selected persisted map. */
export const Route = createFileRoute("/_auth/$workspaceSlug/map/$mapId")({
  loader: async ({ params }): Promise<{ avaMap: AvaMap.T }> => {
    const avaMap = await AvaMapClient.getById({
      id: params.mapId as AvaMap.Id,
    });

    if (!avaMap) {
      throw notFound();
    }

    return { avaMap };
  },
  component: MapEditorPage,
});

function MapEditorPage(): ReactNode {
  const { avaMap } = Route.useLoaderData();
  return <GisApp key={avaMap.id} avaMap={avaMap} />;
}
