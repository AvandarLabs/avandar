import { MultiSelect } from "@mantine/core";
import { ReactNode, useMemo, useState } from "react";
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
  datasetId?: LocalDatasetId;
  value?: readonly LocalDatasetField[];
  defaultValue?: readonly LocalDatasetField[];
  onChange?: (fields: readonly LocalDatasetField[]) => void;
};

const FIELD_NAME_OVERRIDES: Record<string, string> = {
  assignedTo: "Assigned to",
  status: "Status",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

export function FieldSelect({
  label,
  placeholder,
  datasetId,
  value,
  defaultValue = [],
  onChange,
}: Props): JSX.Element {
  const [allDatasets, isLoadingDatasets] = LocalDatasetClient.useGetAll(
    datasetId ? where("id", "eq", datasetId) : undefined,
  );

  const viewableDatasets = useMemo(() => {
    return allDatasets?.filter(isDatasetViewableType) ?? [];
  }, [allDatasets]);

  const fieldsMap = useMemo<Record<UUID, LocalDatasetField>>(() => {
    return makeObjectFromEntries(
      viewableDatasets
        .flatMap((ds: LocalDataset) => {
          return ds.fields;
        })
        .map((f: LocalDatasetField) => {
          return [f.id, f];
        }),
    );
  }, [viewableDatasets]);

  const data = useMemo(() => {
    return viewableDatasets.map((ds) => {
      return {
        group: ds.name,
        items: ds.fields.map((f) => {
          return {
            value: f.id as string,
            label: FIELD_NAME_OVERRIDES[f.name] ?? f.name,
          };
        }),
      };
    });
  }, [viewableDatasets]);

  // Uncontrolled state
  const [internal, setInternal] =
    useState<readonly LocalDatasetField[]>(defaultValue);

  const current = value ?? internal;

  const selectedIds = useMemo(() => {
    return current.map((f) => {
      return f.id as string;
    });
  }, [current]);

  const handleChange = (ids: string[]) => {
    const next = ids
      .map((id) => {
        return fieldsMap[id as UUID];
      })
      .filter(isNotNullOrUndefined);

    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <MultiSelect
      searchable
      clearable
      label={label}
      placeholder={isLoadingDatasets ? "Loading datasets..." : placeholder}
      data={data}
      value={selectedIds}
      onChange={handleChange}
      nothingFoundMessage="No fields"
    />
  );
}
