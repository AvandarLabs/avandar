import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { viewStates } from "./mapFixtures";
import type { useMapScreen } from "./useMapScreen";
import type { ReactNode } from "react";

type Props = Pick<ReturnType<typeof useMapScreen>, "layers" | "selected">;
const _noop = () => {
  return undefined;
};
/** Render the native map layer list and controls. */
export function MapFilmLayers({
  layers,
  selected,
}: Readonly<Props>): ReactNode {
  return (
    <MapChromePanel
      variant="layers"
      id="gis-layers-panel"
      title="Layers"
      itemCount={2}
      isCollapsed={false}
      onToggleCollapsed={_noop}
      collapseLabel="Collapse the layers panel"
      expandLabel="Expand the layers panel"
      headerActions={
        <ActionIcon variant="subtle" color="neutral" aria-label="Add layer">
          <IconPlus size={16} stroke={1.8} />
        </ActionIcon>
      }
    >
      <LayerList
        rows={[layers[1]!, layers[0]!]}
        viewStates={viewStates}
        selectedLayerId={selected.id}
        onStackOrderChange={_noop}
        onSelectLayer={_noop}
        onToggleLayerVisible={_noop}
        onRenameLayer={_noop}
        onDuplicateLayer={_noop}
        onZoomToLayer={_noop}
        onDeleteLayer={_noop}
      />
    </MapChromePanel>
  );
}
