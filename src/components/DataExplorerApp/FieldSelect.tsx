import { MultiSelect } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import { UUID } from "@/lib/types/common";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeObjectFromEntries } from "@/lib/utils/objects/builders";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { type LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset, LocalDatasetId } from "@/models/LocalDataset/types";
import { isDatasetViewableType } from "@/models/LocalDataset/utils";

type Props = {
  label: ReactNode;
  placeholder: string;

  /**
   * If we have a selected dataset, then we will only show fields from
   * that dataset.
   */
  datasetId?: LocalDatasetId;
  onChange: (fields: readonly LocalDatasetField[]) => void;
};

// TODO(jpsyx) we already have LocalDatasetColumnSelect. We shouldnt have both
// components. Refactor and keep only one.
export function FieldSelect({
  onChange,
  label,
  placeholder,
  datasetId,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll(
    datasetId ? where("id", "eq", datasetId) : undefined,
  );

  const viewableDatasets = useMemo(() => {
    return allDatasets?.filter(isDatasetViewableType) ?? [];
  }, [allDatasets]);

  const fieldsMap: Record<UUID, LocalDatasetField> = useMemo(() => {
    return makeObjectFromEntries(
      (viewableDatasets ?? [])
        .flatMap((dataset: LocalDataset) => {
          return dataset.fields;
        })
        .map((field: LocalDatasetField) => {
          return [field.id, field];
        }),
    );
  }, [viewableDatasets]);

  const fieldGroupOptions = useMemo(() => {
    const fieldGroups = (viewableDatasets ?? []).map(
      (dataset: LocalDataset) => {
        return {
          group: dataset.name,
          items: dataset.fields.map((field: LocalDatasetField) => {
            return {
              value: field.id as string,
              label: field.name,
            };
          }),
        };
      },
    );

    return fieldGroups;
  }, [viewableDatasets]);

  return (
    <MultiSelect
      searchable
      clearable
      label={label}
      placeholder={isLoadingDatasets ? "Loading datasets..." : placeholder}
      data={fieldGroupOptions ?? []}
      onChange={(fieldIds: string[]) => {
        const fields = fieldIds
          .map((id) => {
            return fieldsMap[id as UUID];
          })
          .filter(isNotNullOrUndefined);

        onChange(fields);
      }}
    />
  );
}
