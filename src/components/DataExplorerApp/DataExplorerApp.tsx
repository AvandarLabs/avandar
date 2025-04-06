import { Box, Button, Select, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { LocalQueryService } from "@/services/LocalQueryService";
import { useLocalDatasets } from "../DataManagerApp/queries";

export function DataExplorerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const instantiateDB = async () => {
      await LocalQueryService.loadCSVData();
      const data = await LocalQueryService.queryData();
      console.log("Queried data", data);
    };

    instantiateDB();
  }, []);

  const datasetIds = useMemo(() => {
    return allDatasets ?
        allDatasets.map((d) => {
          return { value: String(d.id), label: d.name };
        })
      : undefined;
  }, [allDatasets]);

  console.log("selectedDatasetId", selectedDatasetId);
  return (
    <Box px="md" py="lg">
      <Text>Select fields (fields dropdown)</Text>
      <Text>From dataset (dataset dropdown)</Text>
      <Select
        allowDeselect={false}
        label="From dataset"
        placeholder={
          isLoadingDatasets ? "Loading datasets..." : "Select a dataset"
        }
        data={datasetIds ?? []}
        value={selectedDatasetId}
        onChange={(datasetId) => {
          return setSelectedDatasetId(datasetId ?? undefined);
        }}
      />

      <Text>Where (react-awesome-query-builder)</Text>
      <Text>Group by (fields dropdown)</Text>
      <Text>Order by (fields dropdown)</Text>
      <Text>Limit (number)</Text>
      <Button>Run</Button>
    </Box>
  );
}
