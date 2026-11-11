import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LayerEditorFrame } from "@/views/GisApp/panels/LayerPanel/LayerEditorFrame";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import css from "@/views/GisApp/panels/LayerPanel/LayerPanel.module.css";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { MapChromePanelVariant } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<typeof LayerList> & {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
  /** Layer controls shown under the list while a layer is open. */
  editor?: ReactNode;
  variant?: MapChromePanelVariant;
  bodyId?: string;
};

/** Renders the collapsible layer stack panel and its add-layer control. */
export function LayerPanel({
  isCollapsed,
  onToggleCollapsed,
  onAddLayerFromSource,
  editor = null,
  variant = "layers",
  bodyId,
  ...listProps
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <MapChromePanel
      variant={variant}
      id="gis-layers-panel"
      bodyId={bodyId}
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
      <div className={css.layerListSection}>
        <LayerList {...listProps} />
      </div>
      <LayerEditorFrame editor={editor} />
    </MapChromePanel>
  );
}
