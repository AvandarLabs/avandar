import { Model } from "@avandar/models";
import { makeSelectOptions, Select } from "@avandar/ui";
import { makeIdLookupMap, prop, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useUncontrolled } from "@mantine/hooks";
import { QueryColumn as QueryColumnModule } from "$/models/queries/QueryColumn/QueryColumn";
import { useEffect, useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import type { SelectProps } from "@avandar/ui";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  placeholder: string;
  dataSourceId?: Model.TypedId<QueryDataSource>;
  value?: QueryColumnRead | null;
  defaultValue?: QueryColumnRead | null;
  onChange?: (field: QueryColumnRead | null) => void;
} & Omit<SelectProps<QueryColumnId>, "value" | "defaultValue" | "onChange">;

export function QueryColumnSingleSelect({
  label,
  placeholder,
  dataSourceId,
  value,
  defaultValue,
  onChange,
  ...selectProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const [currentSelectedColumn, setCurrentSelectedColumn] =
    useUncontrolled<QueryColumnRead | null>({
      value,
      defaultValue,
      onChange,
      finalValue: null,
    });

  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        usePreviousDataAsPlaceholder: true,
        enabled: Model.isOfModelType(dataSourceId, "Dataset"),
      },
    });

  const [conceptAttributes, isLoadingConceptAttributes] =
    ConceptAttributeClient.useGetAll({
      ...where("concept_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Concept"),
        usePreviousDataAsPlaceholder: true,
      },
    });

  const isLoading = isLoadingDatasetColumns || isLoadingConceptAttributes;

  const { selectableOptions, queryColumnLookup } = useMemo(() => {
    // TODO(jpsyx): this conversion to QueryColumn should happen in the clients
    // and there should be a global cache
    const queryColumns = [
      ...(datasetColumns ?? []).map((col) => {
        return QueryColumnModule.makeFromDatasetColumn(col);
      }),
      ...(conceptAttributes ?? []).map((col) => {
        return QueryColumnModule.makeFromConceptAttribute(col);
      }),
    ];

    return {
      selectableOptions: makeSelectOptions(queryColumns, {
        valueFn: prop("id"),
        labelFn: prop("baseColumn.name"),
      }),
      queryColumnLookup: makeIdLookupMap(queryColumns),
    };
  }, [datasetColumns, conceptAttributes]);

  // If the available columns change (e.g. if the `dataSourceId` changed)
  // we should drop the selection if it's no longer valid.
  useEffect(() => {
    const columns = [...queryColumnLookup.values()];
    const matchingColumn = columns.find((col) => {
      return col.baseColumn.id === currentSelectedColumn?.baseColumn.id;
    });

    setCurrentSelectedColumn(matchingColumn ?? null);
  }, [queryColumnLookup, currentSelectedColumn, setCurrentSelectedColumn]);

  const selectedColumnId = useMemo(() => {
    return currentSelectedColumn?.id ?? null;
  }, [currentSelectedColumn]);

  return (
    <Select
      searchable
      clearable
      label={label}
      placeholder={isLoading ? t`Loading datasets...` : placeholder}
      data={selectableOptions}
      value={selectedColumnId}
      onChange={(newColumnId) => {
        // convert the column id back to column by looking it up
        const newSelectedColumn =
          newColumnId ?
            (queryColumnLookup.get(newColumnId as QueryColumnId) ?? null)
          : null;
        setCurrentSelectedColumn(newSelectedColumn);
      }}
      nothingFoundMessage={t`No fields`}
      {...selectProps}
    />
  );
}
