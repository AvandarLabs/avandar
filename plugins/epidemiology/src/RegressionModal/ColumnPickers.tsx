import { useT } from "@avandar/plugin-sdk";
import { Group, Select } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

type Props = {
  columnNames: string[];
  xColumn: string;
  yColumn: string;
  isDisabled: boolean;
  onXColumnChange: (column: string) => void;
  onYColumnChange: (column: string) => void;
};

/**
 * The predictor (X) and outcome (Y) pickers, over the numeric columns.
 * `RegressionForm` owns the chosen columns and passes them in.
 */
export function ColumnPickers(props: Readonly<Props>): ReactNode {
  const t = useT();
  return (
    <Group grow>
      <Select
        label={t("modal.xColumn")}
        data={props.columnNames}
        value={props.xColumn}
        disabled={props.isDisabled}
        allowDeselect={false}
        onChange={(column) => {
          if (column !== null) {
            props.onXColumnChange(column);
          }
        }}
      />
      <Select
        label={t("modal.yColumn")}
        data={props.columnNames}
        value={props.yColumn}
        disabled={props.isDisabled}
        allowDeselect={false}
        onChange={(column) => {
          if (column !== null) {
            props.onYColumnChange(column);
          }
        }}
      />
    </Group>
  );
}
