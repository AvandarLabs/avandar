import { Select } from "@avandar/ui";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import {
  EXPLORER_CASES_DATASET_ID,
  EXPLORER_CASES_DATASET_NAME,
  EXPLORER_SELECTED_COLUMNS,
} from "../Explorer.constants";
import type { ReactNode } from "react";

const _noop = () => {};
/** Present the product source selector and selected query columns. */
export function ExplorerSourceFields(): ReactNode {
  return (
    <>
      <div data-video-target="explorer-source">
        <Select
          label="Data source"
          placeholder="Select a data source"
          value={EXPLORER_CASES_DATASET_ID}
          data={[
            {
              value: EXPLORER_CASES_DATASET_ID,
              label: EXPLORER_CASES_DATASET_NAME,
            },
          ]}
          onChange={_noop}
        />
      </div>
      <QueryColumnMultiSelect
        label="Select columns"
        placeholder="Select columns to query"
        value={EXPLORER_SELECTED_COLUMNS}
        onChange={_noop}
        comboboxProps={{ withinPortal: false }}
      />
    </>
  );
}
