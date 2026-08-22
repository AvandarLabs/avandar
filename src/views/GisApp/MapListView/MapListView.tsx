import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { CreateMapButton } from "@/views/GisApp/MapListView/CreateMapButton";
import { EmptyMapList } from "@/views/GisApp/MapListView/EmptyMapList";
import { MapGrid } from "@/views/GisApp/MapListView/MapGrid";

type Props = { avaMaps: readonly AvaMap.T[]; workspaceSlug: string };

/** Lists workspace-visible maps and creates new maps for the workspace. */
export function MapListView({ avaMaps, workspaceSlug }: Props): ReactNode {
  const { t } = useLingui();
  const canManageMaps = useHasPermission("gis__can_manage_maps");

  return (
    <AppLayout
      title={t`Maps`}
      toolbarButtonSection={
        canManageMaps ? <CreateMapButton workspaceSlug={workspaceSlug} /> : null
      }
      containerProps={{ p: "md" }}
    >
      {avaMaps.length === 0 ? (
        <EmptyMapList />
      ) : (
        <MapGrid avaMaps={avaMaps} workspaceSlug={workspaceSlug} />
      )}
    </AppLayout>
  );
}
