import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { BoundaryColumnSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls/BoundaryColumnSelect";

type Props = {
  columnData: Array<{ value: DatasetColumn.Id; label: string }>;
  geometryColumnId: DatasetColumn.Id;
  keyColumnId: DatasetColumn.Id;
  displayNameColumnId: DatasetColumn.Id | undefined;
  onColumnChange: (
    field: "geometryColumnId" | "keyColumnId" | "displayNameColumnId",
    columnId: DatasetColumn.Id | undefined,
  ) => void;
};

/** Edits geometry, key, and optional display-name columns for a boundary. */
export function BoundaryColumnFields({
  columnData,
  geometryColumnId,
  keyColumnId,
  displayNameColumnId,
  onColumnChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <BoundaryColumnSelect
        label={t`Boundary geometry column`}
        data={columnData}
        value={geometryColumnId}
        onChange={(value) => {
          onColumnChange("geometryColumnId", value);
        }}
      />
      <BoundaryColumnSelect
        label={t`Boundary key column`}
        data={columnData}
        value={keyColumnId}
        onChange={(value) => {
          onColumnChange("keyColumnId", value);
        }}
      />
      <Select
        label={t`Boundary display name`}
        data={columnData}
        value={displayNameColumnId ?? null}
        clearable
        onChange={(value) => {
          onColumnChange(
            "displayNameColumnId",
            value ? (value as DatasetColumn.Id) : undefined,
          );
        }}
      />
    </>
  );
}
