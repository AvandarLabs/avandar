import { where } from "@avandar/utils";
import { createFileRoute } from "@tanstack/react-router";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { MapListView } from "@/views/GisApp/MapListView/MapListView";
import type { ReactNode } from "react";

/** Renders the current workspace's map collection. */
export const Route = createFileRoute("/_auth/$workspaceSlug/map/")({
  component: MapsPage,
});

function MapsPage(): ReactNode {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();
  const [avaMaps = []] = AvaMapClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return <MapListView avaMaps={avaMaps} workspaceSlug={workspaceSlug} />;
}
