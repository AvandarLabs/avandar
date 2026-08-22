import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

import { MapTopBar } from "@/views/GisApp/shell/MapTopBar/MapTopBar";
import { useGisAppTopBarActions } from "@/views/GisApp/useGisAppTopBarActions";

type Props = { app: GisAppState; onOpenExport: () => void };

/** Renders title, save, basemap, and bookmark controls for the current map. */
export function GisAppTopBar({ app, onOpenExport }: Props): ReactNode {
  const actions = useGisAppTopBarActions(app);

  return (
    <MapTopBar
      avaMapId={app.avaMap.id}
      name={app.name}
      saveState={app.saveState}
      basemap={app.mapConfig.basemap}
      bookmarks={app.mapConfig.bookmarks}
      onNameChange={app.updateName}
      onOpenExport={onOpenExport}
      {...actions}
    />
  );
}
