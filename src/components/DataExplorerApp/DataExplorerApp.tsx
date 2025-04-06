import { Box, Button, MultiSelect, Select, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import * as R from "remeda";
import { LocalQueryClient } from "@/clients/LocalQueryClient";
import * as LocalDataset from "@/models/LocalDataset";
import { UUID } from "@/types/common";
import { useLocalDatasets } from "../DataManagerApp/queries";

export function DataExplorerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    number | undefined
  >(undefined);
  const [selectedFieldIds, setSelectedFieldIds] = useState<readonly UUID[]>([]);

  const fieldsMap: Record<UUID, LocalDataset.Field> = useMemo(() => {
    return R.pipe(
      allDatasets ?? [],
      R.flatMap((dataset) => {
        return dataset.fields;
      }),
      R.mapToObj((field) => {
        return [field.id, field];
      }),
    );
  }, [allDatasets]);

  const datasetOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset.T) => {
      return { value: String(dataset.id), label: dataset.name };
    });
  }, [allDatasets]);

  const fieldGroupOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset) => {
      return {
        group: dataset.name,
        items: dataset.fields.map((field) => {
          return {
            value: field.id as string,
            label: field.name,
          };
        }),
      };
    });
  }, [allDatasets]);

  return (
    <Box px="md" py="lg">
      <MultiSelect
        searchable
        clearable
        label="Select fields"
        placeholder={
          isLoadingDatasets ? "Loading datasets..." : "Select fields"
        }
        data={fieldGroupOptions ?? []}
        onChange={(fieldIds: string[]) => {
          setSelectedFieldIds(fieldIds as UUID[]);
        }}
      />

      <Select
        allowDeselect={false}
        label="From dataset"
        placeholder={
          isLoadingDatasets ? "Loading datasets..." : "Select a dataset"
        }
        data={datasetOptions ?? []}
        value={String(selectedDatasetId)}
        onChange={async (datasetId: string | null) => {
          if (datasetId) {
            const datasetIdNum = Number(datasetId);
            setSelectedDatasetId(datasetIdNum);
            await LocalQueryClient.loadDataset(datasetIdNum);
          } else {
            setSelectedDatasetId(undefined);
          }
        }}
      />

      <Text>Where (react-awesome-query-builder)</Text>
      <Text>Group by (fields dropdown)</Text>
      <Text>Order by (fields dropdown)</Text>
      <Text>Limit (number)</Text>
      <Button
        onClick={async () => {
          const fieldNames = R.pipe(
            selectedFieldIds,
            R.map((id) => {
              return fieldsMap[id]?.name;
            }),
            R.filter(R.isTruthy),
          );

          if (selectedDatasetId) {
            // TODO(pablo): we need some way to determine if datasets have
            // loaded otherwise we can't run the query
            const result = await LocalQueryClient.runQuery({
              datasetId: selectedDatasetId,
              fieldNames,
            });
            console.log("result", result);
          }
        }}
      >
        Run
      </Button>
    </Box>
  );
}
