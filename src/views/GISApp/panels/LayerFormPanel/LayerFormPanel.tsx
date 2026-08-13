import { useBoolean } from "@avandar/hooks";
import { Model } from "@avandar/models";
import { mantineColorVar, mantineVar, Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, ColorInput, Flex, Popover, Stack } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn as QueryColumnFns } from "$/models/queries/QueryColumn/QueryColumn";
import { notifyError } from "@/utils/notifications/notify";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapStylePicker } from "@/views/GISApp/basemap/MapStylePicker";
import { mapStyles } from "@/views/GISApp/basemap/mapStyles";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Props = {
  layer: MapLayer.T;
  basemap: AvaMap.Basemap;
  onLayerChange: (update: (current: MapLayer.T) => MapLayer.T) => void;
  onBasemapChange: (basemap: AvaMap.Basemap) => void;
};

/**
 * Adds `column` to the layer's query if it is not already selected. Columns a
 * layer binds to must be part of its query, or the binding cannot resolve.
 */
function _withQueryColumn(
  layer: MapLayer.T,
  column: QueryColumn.T,
): MapLayer.T {
  const isAlreadySelected = layer.source.queryColumns.some((candidate) => {
    return candidate.id === column.id;
  });
  if (isAlreadySelected) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, column],
    },
  };
}

/** Finds a query column already selected on the layer by its id. */
function _findQueryColumn(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): QueryColumn.T | undefined {
  if (!columnId) {
    return undefined;
  }
  return layer.source.queryColumns.find((candidate) => {
    return candidate.id === columnId;
  });
}

/** True when `column` is already in the layer's selected query columns. */
function _hasQueryColumn(layer: MapLayer.T, column: QueryColumn.T): boolean {
  return layer.source.queryColumns.some((candidate) => {
    return candidate.id === column.id;
  });
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
}: Props): JSX.Element {
  const { t } = useLingui();
  const [isPopoverOpen, , close, toggle] = useBoolean(false);
  const { hovered, ref } = useHover();

  const selectedDataSource = layer.source.dataSource;
  const latitudeColumn = _findQueryColumn(layer, layer.geoBinding?.latitude);
  const longitudeColumn = _findQueryColumn(layer, layer.geoBinding?.longitude);
  const symbolSizeColumn =
    layer.symbology.type === "proportionalSymbol" ?
      _findQueryColumn(layer, layer.symbology.value)
    : undefined;
  const symbolColor = layer.symbology.color.color;

  return (
    <Stack gap="xxxs">
      <MapStylePicker
        mapStyles={mapStyles}
        value={basemap.type === "builtIn" ? basemap.style : undefined}
        onChange={(style) => {
          onBasemapChange({ type: "builtIn", style });
        }}
      />
      <Flex ref={ref} pos="relative" align="center" mt="xs">
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
                style={{
                  borderRadius: "50%",
                  border: `1px solid ${mantineColorVar("neutral.3")}`,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  transform:
                    isPopoverOpen || hovered ? "scale(1.2)" : "scale(1)",
                  boxShadow:
                    isPopoverOpen || hovered ?
                      mantineVar("shadow-lg")
                    : mantineVar("shadow-md"),
                }}
                aria-label={t`Query form`}
              >
                <IconFilter size={20} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <Stack gap="md">
              <QueryDataSourceSelect
                value={selectedDataSource ?? null}
                onChange={(value) => {
                  const dataSource = value ?? undefined;
                  onLayerChange((current) => {
                    const isUnchanged =
                      current.source.dataSource === dataSource &&
                      current.source.queryColumns.length === 0 &&
                      current.geoBinding === undefined;
                    if (isUnchanged) {
                      return current;
                    }
                    return {
                      ...current,
                      source: {
                        ...current.source,
                        dataSource,
                        queryColumns: [],
                      } as PartialStructuredQuery,
                      geoBinding: undefined,
                    };
                  });
                }}
                comboboxProps={{ withinPortal: false }}
              />
              <QueryColumnSingleSelect
                label={t`Latitude column`}
                placeholder={t`Select latitude column`}
                dataSourceId={
                  selectedDataSource ?
                    Model.getTypedId(selectedDataSource)
                  : undefined
                }
                value={latitudeColumn ?? null}
                onChange={(column) => {
                  onLayerChange((current) => {
                    const isUnchanged =
                      column?.id === current.geoBinding?.latitude &&
                      (!column || _hasQueryColumn(current, column));
                    if (isUnchanged) {
                      return current;
                    }
                    const withColumn =
                      column ? _withQueryColumn(current, column) : current;
                    return {
                      ...withColumn,
                      geoBinding: {
                        type: "latLngColumns",
                        latitude: column?.id,
                        longitude: withColumn.geoBinding?.longitude,
                      },
                    };
                  });
                }}
                comboboxProps={{ withinPortal: false }}
              />
              <QueryColumnSingleSelect
                label={t`Longitude column`}
                placeholder={t`Select longitude column`}
                dataSourceId={
                  selectedDataSource ?
                    Model.getTypedId(selectedDataSource)
                  : undefined
                }
                value={longitudeColumn ?? null}
                onChange={(column) => {
                  onLayerChange((current) => {
                    const isUnchanged =
                      column?.id === current.geoBinding?.longitude &&
                      (!column || _hasQueryColumn(current, column));
                    if (isUnchanged) {
                      return current;
                    }
                    const withColumn =
                      column ? _withQueryColumn(current, column) : current;
                    return {
                      ...withColumn,
                      geoBinding: {
                        type: "latLngColumns",
                        latitude: withColumn.geoBinding?.latitude,
                        longitude: column?.id,
                      },
                    };
                  });
                }}
                comboboxProps={{ withinPortal: false }}
              />
              <QueryColumnSingleSelect
                label={t`Symbol size`}
                placeholder={t`Select symbol size column`}
                dataSourceId={
                  selectedDataSource ?
                    Model.getTypedId(selectedDataSource)
                  : undefined
                }
                value={symbolSizeColumn ?? null}
                onChange={(column) => {
                  if (column && !QueryColumnFns.isNumeric(column)) {
                    notifyError({
                      title: t`Invalid column type`,
                      message: t`Symbol size column must be numeric.`,
                    });
                    return;
                  }
                  onLayerChange((current) => {
                    if (!column) {
                      if (current.symbology.type === "circle") {
                        return current;
                      }
                      return {
                        ...current,
                        symbology: {
                          type: "circle",
                          radius: 6,
                          color: current.symbology.color,
                          stroke: current.symbology.stroke,
                        },
                      };
                    }
                    const isUnchanged =
                      current.symbology.type === "proportionalSymbol" &&
                      current.symbology.value === column.id &&
                      _hasQueryColumn(current, column);
                    if (isUnchanged) {
                      return current;
                    }
                    const withColumn = _withQueryColumn(current, column);
                    return {
                      ...withColumn,
                      symbology: {
                        type: "proportionalSymbol",
                        value: column.id,
                        minRadius: 4,
                        maxRadius: 24,
                        scale: "sqrt",
                        color: current.symbology.color,
                        stroke: current.symbology.stroke,
                      },
                    };
                  });
                }}
                comboboxProps={{ withinPortal: false }}
              />
              <ColorInput
                label={t`Symbol color`}
                value={symbolColor}
                onChange={(color) => {
                  onLayerChange((current) => {
                    if (current.symbology.color.color === color) {
                      return current;
                    }
                    return {
                      ...current,
                      symbology: {
                        ...current.symbology,
                        color: { type: "single", color },
                      },
                    };
                  });
                }}
                popoverProps={{
                  withinPortal: false,
                }}
                format="hex"
                swatches={[
                  "#3b82f6",
                  "#ef4444",
                  "#10b981",
                  "#f59e0b",
                  "#8b5cf6",
                  "#ec4899",
                  "#06b6d4",
                  "#84cc16",
                ]}
              />
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Flex>
    </Stack>
  );
}
