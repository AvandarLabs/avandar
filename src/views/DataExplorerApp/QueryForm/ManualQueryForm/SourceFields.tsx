import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";

import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";

type Props = {
  dataSource: QueryDataSource.T | undefined;
  queryColumns: StructuredQuery.Partial["queryColumns"];
  onDataSourceChange: (dataSource: QueryDataSource.T | null) => void;
  onSetColumns: (columns: readonly QueryColumn.T[]) => void;
  withinPortal: boolean;
};

/** Data source picker plus the column multi-select it populates. */
export function SourceFields({
  dataSource,
  queryColumns,
  onDataSourceChange,
  onSetColumns,
  withinPortal,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <QueryDataSourceSelect
        value={dataSource ?? null}
        onChange={onDataSourceChange}
        comboboxProps={{ withinPortal }}
      />
      <QueryColumnMultiSelect
        label={t`Select columns`}
        placeholder={t`Select columns to query`}
        dataSourceId={dataSource ? Model.getTypedId(dataSource) : undefined}
        value={queryColumns}
        onChange={onSetColumns}
        comboboxProps={{ withinPortal }}
      />
    </>
  );
}
