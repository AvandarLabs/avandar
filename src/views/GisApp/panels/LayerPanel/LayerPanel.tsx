import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ComponentProps, ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import css from "@/views/GisApp/panels/LayerPanel/LayerPanel.module.css";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";

type Props = ComponentProps<typeof LayerList> & {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
};

/** Renders the collapsible layer stack panel and its add-layer control. */
export function LayerPanel({
  isCollapsed,
  onToggleCollapsed,
  onAddLayerFromSource,
  ...listProps
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <MapChromePanel
      variant="layers"
      id="gis-layers-panel"
      title={t`Layers`}
      itemCount={
        listProps.rows.length + (listProps.annotations?.features.length ? 1 : 0)
      }
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the layers panel`}
      expandLabel={t`Expand the layers panel`}
      headerActions={
        <LayerSourcePicker onSourceSelected={onAddLayerFromSource}>
          {(pickerProps) => {
            return (
              <ActionIcon
                {...pickerProps}
                className={css.layerPanelHeaderAction}
                variant="subtle"
                color="neutral"
                aria-label={t`Add layer`}
              >
                <IconPlus size={16} stroke={1.8} />
              </ActionIcon>
            );
          }}
        </LayerSourcePicker>
      }
    >
      <LayerList {...listProps} />
    </MapChromePanel>
  );
}
