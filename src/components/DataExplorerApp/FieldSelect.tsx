import { MultiSelect } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import { UUID } from "@/lib/types/common";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeObjectFromEntries } from "@/lib/utils/objects/builders";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { type LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset } from "@/models/LocalDataset/types";

type Props = {
  label: ReactNode;
  placeholder: string;
  onChange: (fields: readonly LocalDatasetField[]) => void;
};

export function FieldSelect({
  onChange,
  label,
  placeholder,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll();
  const fieldsMap: Record<UUID, LocalDatasetField> = useMemo(() => {
    return makeObjectFromEntries(
      (allDatasets ?? [])
        .flatMap((dataset: LocalDataset) => {
          return dataset.fields;
        })
        .map((field: LocalDatasetField) => {
          return [field.id, field];
        }),
    );
  }, [allDatasets]);

  const fieldGroupOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset) => {
      return {
        group: dataset.name,
        items: dataset.fields.map((field: LocalDatasetField) => {
          return {
            value: field.id as string,
            label: field.name,
          };
        }),
      };
    });
  }, [allDatasets]);

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
