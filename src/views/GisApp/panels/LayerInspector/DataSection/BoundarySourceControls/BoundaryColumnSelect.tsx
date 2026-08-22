import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

import { Select } from "@mantine/core";

type Props = {
  label: string;
  data: Array<{ value: DatasetColumn.Id; label: string }>;
  value: DatasetColumn.Id;
  onChange: (value: DatasetColumn.Id) => void;
};

/** Selects a required column from a boundary dataset. */
export function BoundaryColumnSelect({
  label,
  data,
  value,
  onChange,
}: Props): ReactNode {
  return (
    <Select
      label={label}
      data={data}
      value={value}
      allowDeselect={false}
      onChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as DatasetColumn.Id);
        }
      }}
    />
  );
}
