import { MultiSelect } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import { UUID } from "@/lib/types/common";
import { isNotNullOrUndefined } from "@/lib/utils/guards";
import { makeObjectFromEntries } from "@/lib/utils/objects";
import { type DatasetField } from "@/models/DatasetField";
import { LocalDataset } from "@/models/LocalDataset";
import { useLocalDatasets } from "../DataManagerApp/queries";

type Props = {
  label: ReactNode;
  placeholder: string;
  onChange: (fields: readonly DatasetField[]) => void;
};

export function FieldSelect({
  onChange,
  label,
  placeholder,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const fieldsMap: Record<UUID, DatasetField> = useMemo(() => {
    return makeObjectFromEntries(
      (allDatasets ?? [])
        .flatMap((dataset: LocalDataset) => {
          return dataset.fields;
        })
        .map((field: DatasetField) => {
          return [field.id, field];
        }),
    );
  }, [allDatasets]);

  const fieldGroupOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset) => {
      return {
        group: dataset.name,
        items: dataset.fields.map((field: DatasetField) => {
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
