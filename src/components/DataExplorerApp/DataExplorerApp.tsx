import { Box, Button, Select, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import * as R from "remeda";
import { LocalQueryClient } from "@/clients/LocalQueryClient";
import * as LocalDataset from "@/models/LocalDataset";
import { useLocalDatasets } from "../DataManagerApp/queries";
import { DataGrid } from "../ui/DataGrid";
import { FieldSelect } from "./FieldSelect";
import { useDataQuery } from "./useDataQuery";

export function DataExplorerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    number | undefined
  >(undefined);
  const [selectedFields, setSelectedFields] = useState<
    readonly LocalDataset.Field[]
  >([]);
  const [selectedGroupByFields, setSelectedGroupByFields] = useState<
    readonly LocalDataset.Field[]
  >([]);

  const datasetOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset.T) => {
      return { value: String(dataset.id), label: dataset.name };
    });
  }, [allDatasets]);

  const selectedFieldNames = useMemo(() => {
    return R.map(selectedFields, R.prop("name"));
  }, [selectedFields]);
  const selectedGroupByFieldNames = useMemo(() => {
    return R.map(selectedGroupByFields, R.prop("name"));
  }, [selectedGroupByFields]);

  const { data, isLoading } = useDataQuery({
    datasetId: selectedDatasetId,
    selectFieldNames: selectedFieldNames,
    groupByFieldNames: selectedGroupByFieldNames,
  });

  return (
    <Box px="md" py="lg">
      <FieldSelect
        label="Select fields"
        placeholder="Select fields"
        onChange={setSelectedFields}
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
      <FieldSelect
        label="Group by"
        placeholder="Group by"
        onChange={setSelectedGroupByFields}
      />
      <Text>Order by (fields dropdown)</Text>
      <Text>Limit (number)</Text>
      <Button
        loading={isLoading}
        onClick={async () => {
          if (selectedDatasetId) {
            // TODO(pablo): we need some way to determine if datasets have
            // loaded otherwise we can't run the query
            const result = await LocalQueryClient.runQuery({
              datasetId: selectedDatasetId,
              selectFieldNames: selectedFieldNames,
              groupByFieldNames: selectedGroupByFieldNames,
            });
            console.log("result", result);
          }
        }}
      >
        Run
      </Button>

      <DataGrid fields={selectedFieldNames} data={data ?? []} />
    </Box>
  );
}
