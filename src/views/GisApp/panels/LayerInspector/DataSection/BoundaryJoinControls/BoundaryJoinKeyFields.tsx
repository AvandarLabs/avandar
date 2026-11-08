import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { Model } from "@avandar/models";
import type { ReactNode } from "react";

type Props = {
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  dataKeyColumn: QueryColumn.T;
  matching: "exact" | "normalizedName";
  onJoinChange: (
    column: QueryColumn.T,
    matching: "exact" | "normalizedName",
  ) => void;
};

/** A list of values cannot be matched to one boundary key. */
function _isNotList(column: QueryColumn.T): boolean {
  return !QueryColumn.isList(column);
}

/** Edits the source key column and name-matching mode for a boundary join. */
export function BoundaryJoinKeyFields({
  dataSourceId,
  dataKeyColumn,
  matching,
  onJoinChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Data key column`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        isColumnSelectable={_isNotList}
        value={dataKeyColumn}
        onChange={(column) => {
          if (column) {
            onJoinChange(column, matching);
          }
        }}
      />
      <Select
        label={t`Matching`}
        data={[
          { value: "exact", label: t`Exact` },
          { value: "normalizedName", label: t`Normalized name` },
        ]}
        value={matching}
        allowDeselect={false}
        onChange={(nextMatching) => {
          if (nextMatching === "exact" || nextMatching === "normalizedName") {
            onJoinChange(dataKeyColumn, nextMatching);
          }
        }}
      />
    </>
  );
}
