import { Box } from "@mantine/core";
import "maplibre-gl/dist/maplibre-gl.css";
import { DataMap } from "./DataMap/DataMap";

export function GISApp(): JSX.Element {
  return (
    <Box w="100%" mih="100dvh" pos="relative">
      <DataMap />
    </Box>
  );
}
