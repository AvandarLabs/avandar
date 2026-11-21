import { Button } from "@mantine/core";
import { IconDownload, IconShare } from "@tabler/icons-react";
import { BasemapControl } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl";
import { MapTitleInput } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput";
import topBarCss from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import { SaveStateIndicator } from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator";
import { ViewsMenu } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu";
import { BASEMAP } from "./mapFixtures";
import type { ReactNode } from "react";

const _noop = () => {
  return undefined;
};
/** Render the native map title and toolbar actions. */
export function MapFilmTopBar(): ReactNode {
  return (
    <>
      <div className={topBarCss.mapTopBarCluster}>
        <MapTitleInput
          name="Video - Harborfield response map - pilot"
          onNameChange={_noop}
        />
        <SaveStateIndicator saveState="saved" />
      </div>
      <div className={topBarCss.mapTopBarCluster}>
        <BasemapControl basemap={BASEMAP} onBasemapChange={_noop} />
        <ViewsMenu
          bookmarks={[]}
          onSaveCurrentView={_noop}
          onGoToBookmark={_noop}
          onRemoveBookmark={_noop}
        />
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconShare size={16} />}
        >
          Share
        </Button>
        <Button
          size="compact-sm"
          leftSection={<IconDownload size={15} stroke={1.5} />}
        >
          Export
        </Button>
      </div>
    </>
  );
}
