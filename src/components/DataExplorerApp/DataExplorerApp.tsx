import { Box, Button, Text } from "@mantine/core";
import { useEffect } from "react";
import { LocalQueryService } from "@/services/LocalQueryService";

export function DataExplorerApp(): JSX.Element {
  useEffect(() => {
    const instantiateDB = async () => {
      await LocalQueryService.loadCSVData();
      const data = await LocalQueryService.queryData();
      console.log("Queried data", data);
    };

    instantiateDB();
  }, []);

  return (
    <Box px="md" py="lg">
      <Text>Select fields (fields dropdown)</Text>
      <Text>From dataset (dataset dropdown)</Text>
      <Text>Where (react-awesome-query-builder)</Text>
      <Text>Group by (fields dropdown)</Text>
      <Text>Order by (fields dropdown)</Text>
      <Text>Limit (number)</Text>
      <Button>Run</Button>
    </Box>
  );
}
