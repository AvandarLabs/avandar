import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  pointsType: MapLayer.PointBinding["type"];
  sourceColumns: readonly QueryColumn.T[];
  onPointsTypeChange: (points: MapLayer.PointBinding) => void;
};

function _createPointGeometryBinding(
  sourceColumns: readonly QueryColumn.T[],
): MapLayer.PointBinding {
  const geometryColumn = sourceColumns[0];
  if (!geometryColumn) {
    return {
      type: "latLngColumns",
      latitude: undefined,
      longitude: undefined,
    };
  }
  return {
    type: "geometryColumn",
    column: geometryColumn.id,
    encoding: "wkt",
    family: "point",
    simplification: undefined,
    sourceCrs: undefined,
  };
}

/** Chooses whether aggregated points use coordinates or a geometry column. */
export function PointGeometryTypeSelect({
  pointsType,
  sourceColumns,
  onPointsTypeChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Point geometry`}
      data={[
        { value: "latLngColumns", label: t`Latitude and longitude columns` },
        { value: "geometryColumn", label: t`Point geometry column` },
      ]}
      value={pointsType}
      allowDeselect={false}
      onChange={(value) => {
        onPointsTypeChange(
          value === "geometryColumn" ?
            _createPointGeometryBinding(sourceColumns)
          : {
              type: "latLngColumns",
              latitude: undefined,
              longitude: undefined,
            },
        );
      }}
    />
  );
}
