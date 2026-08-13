import { useBoolean } from "@avandar/hooks";
import { Model } from "@avandar/models";
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, ColorInput, Flex, Popover, Stack } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { QueryColumn as QueryColumnFns } from "$/models/queries/QueryColumn/QueryColumn";
import { notifyError } from "@/utils/notifications/notify";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapStylePicker } from "@/views/GisApp/basemap/MapStylePicker";
import { MapStyles } from "@/views/GisApp/basemap/MapStyles";
import css from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.module.css";
import { MapLayerUpdates } from "@/views/GisApp/panels/LayerFormPanel/MapLayerUpdates";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

/** Palette offered by the symbol-color picker. */
const SYMBOL_COLOR_SWATCHES = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

type LayerChangeHandler = (update: (current: MapLayer.T) => MapLayer.T) => void;

type Props = {
  layer: MapLayer.T;
  basemap: AvaMap.Basemap;
  onLayerChange: LayerChangeHandler;
  onBasemapChange: (basemap: AvaMap.Basemap) => void;
};

/** The layer's data source, geometry columns, symbol size, and symbol color. */
function LayerFields({
  layer,
  onLayerChange,
}: {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
}): ReactNode {
  const { t } = useLingui();
  const selectedDataSource = layer.source.dataSource;
  const dataSourceId =
    selectedDataSource ? Model.getTypedId(selectedDataSource) : undefined;
  const latitudeColumn = MapLayerUpdates.findQueryColumn(
    layer,
    layer.geoBinding?.latitude,
  );
  const longitudeColumn = MapLayerUpdates.findQueryColumn(
    layer,
    layer.geoBinding?.longitude,
  );
  const symbolSizeColumn =
    layer.symbology.type === "proportionalSymbol" ?
      MapLayerUpdates.findQueryColumn(layer, layer.symbology.value)
    : undefined;

  const onSymbolSizeChange = (column: QueryColumn.T | null): void => {
    if (column && !QueryColumnFns.isNumeric(column)) {
      notifyError({
        title: t`Invalid column type`,
        message: t`Symbol size column must be numeric.`,
      });
      return;
    }
    onLayerChange((current) => {
      return MapLayerUpdates.withSymbolSizeColumn(current, column ?? undefined);
    });
  };

  return (
    <Stack gap="md">
      <QueryDataSourceSelect
        value={selectedDataSource ?? null}
        onChange={(value) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withDataSource(current, value ?? undefined);
          });
        }}
        comboboxProps={{ withinPortal: false }}
      />
      <QueryColumnSingleSelect
        label={t`Latitude column`}
        placeholder={t`Select latitude column`}
        dataSourceId={dataSourceId}
        value={latitudeColumn ?? null}
        onChange={(column) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withGeoBindingAxis(
              current,
              "latitude",
              column ?? undefined,
            );
          });
        }}
        comboboxProps={{ withinPortal: false }}
      />
      <QueryColumnSingleSelect
        label={t`Longitude column`}
        placeholder={t`Select longitude column`}
        dataSourceId={dataSourceId}
        value={longitudeColumn ?? null}
        onChange={(column) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withGeoBindingAxis(
              current,
              "longitude",
              column ?? undefined,
            );
          });
        }}
        comboboxProps={{ withinPortal: false }}
      />
      <QueryColumnSingleSelect
        label={t`Symbol size`}
        placeholder={t`Select symbol size column`}
        dataSourceId={dataSourceId}
        value={symbolSizeColumn ?? null}
        onChange={onSymbolSizeChange}
        comboboxProps={{ withinPortal: false }}
      />
      <ColorInput
        label={t`Symbol color`}
        value={layer.symbology.color.color}
        onChange={(color) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolColor(current, color);
          });
        }}
        popoverProps={{ withinPortal: false }}
        format="hex"
        swatches={SYMBOL_COLOR_SWATCHES}
      />
    </Stack>
  );
}

/**
 * The layer editing panel for the GIS app: picks the layer's data source,
 * its latitude and longitude columns, an optional symbol size column, its
 * color, and the map's basemap style.
 */
export function LayerFormPanel({
  layer,
  basemap,
  onLayerChange,
  onBasemapChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [isPopoverOpen, , close, toggle] = useBoolean(false);

  return (
    <Stack gap="xxxs">
      <MapStylePicker
        mapStyles={MapStyles}
        value={basemap.type === "builtIn" ? basemap.style : "avandar"}
        onChange={(style) => {
          onBasemapChange({ type: "builtIn", style });
        }}
      />
      <Flex pos="relative" align="center" mt="xs">
        <Popover
          opened={isPopoverOpen}
          onChange={toggle}
          onDismiss={close}
          position="bottom-start"
          offset={8}
          withinPortal={false}
          transitionProps={{
            transition: "pop-top-left",
            duration: 200,
            timingFunction: "ease-out",
          }}
          shadow="md"
        >
          <Popover.Target>
            <Tooltip label={t`Filter`} position="right">
              <ActionIcon
                size="lg"
                variant="white"
                color="neutral"
                onClick={toggle}
                className={css.filterButton}
                data-active={isPopoverOpen}
                aria-label={t`Query form`}
              >
                <IconFilter size={20} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <LayerFields layer={layer} onLayerChange={onLayerChange} />
          </Popover.Dropdown>
        </Popover>
      </Flex>
    </Stack>
  );
}
