import { MapTopBar } from "@/views/GisApp/shell/MapTopBar/MapTopBar";
import { useGisAppTopBarActions } from "@/views/GisApp/useGisAppTopBarActions";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Renders title, save, basemap, and bookmark controls for the current map. */
export function GisAppTopBar({ app }: Props): ReactNode {
  const actions = useGisAppTopBarActions(app);

  return (
    <MapTopBar
      avaMapId={app.avaMap.id}
      name={app.name}
      saveState={app.saveState}
      basemap={app.mapConfig.basemap}
      bookmarks={app.mapConfig.bookmarks}
      onNameChange={app.updateName}
      {...actions}
    />
  );
}
