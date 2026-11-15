import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  value: AvaDataType.T;
  onChange: (dataType: AvaDataType.T) => void;
};

/** Picks the type of a column of the combined dataset. */
export function ColumnTypeSelect({
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      size="xs"
      label={t`Type`}
      allowDeselect={false}
      value={value}
      data={AvaDataType.Types.map((dataType) => {
        return { value: dataType, label: avaDataTypeLabel(dataType) };
      })}
      onChange={(selected) => {
        const dataType = AvaDataType.Types.find((candidate) => {
          return candidate === selected;
        });
        if (dataType) {
          onChange(dataType);
        }
      }}
    />
  );
}
