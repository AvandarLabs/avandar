import { MultiSelect } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import * as R from "remeda";
import * as LocalDataset from "@/models/LocalDataset";
import { UUID } from "@/types/common";
import { useLocalDatasets } from "../DataManagerApp/queries";

type Props = {
  label: ReactNode;
  placeholder: string;
  onChange: (fields: readonly LocalDataset.Field[]) => void;
};

export function FieldSelect({
  onChange,
  label,
  placeholder,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const fieldsMap: Record<UUID, LocalDataset.Field> = useMemo(() => {
    return R.pipe(
      allDatasets ?? [],
      R.flatMap((dataset: LocalDataset.T) => {
        return dataset.fields;
      }),
      R.mapToObj((field: LocalDataset.Field) => {
        return [field.id, field];
      }),
    );
  }, [allDatasets]);

  const fieldGroupOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset.T) => {
      return {
        group: dataset.name,
        items: dataset.fields.map((field: LocalDataset.Field) => {
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
        const fields = R.pipe(
          fieldIds,
          R.map((id) => {
            return fieldsMap[id as UUID];
          }),
          R.filter(R.isTruthy),
        );

        onChange(fields);
      }}
    />
  );
}
