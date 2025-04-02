import { Container, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import * as LocalDataset from "@/models/LocalDataset";
import { DataGrid } from "../ui/DataGrid";
import { useCSV } from "./useCSV";

type Props = {
  dataset: LocalDataset.T;
};

export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const { csv, parseCSVString } = useCSV();

  useEffect(() => {
    parseCSVString(dataset.data);
  }, [dataset.data, parseCSVString]);

  return (
    <Container>
      <Title order={2}>{dataset.name}</Title>
      <Text>{dataset.description}</Text>
      <Text>Delimiter: {dataset.delimiter}</Text>
      <Text>Is first row header: {dataset.firstRowIsHeader}</Text>
      <Text>File type: {dataset.mimeType}</Text>
      <Text>Size in bytes: {dataset.sizeInBytes}</Text>
      <Text>Created at: {dataset.createdAt.toISOString()}</Text>
      <Text>Last updated: {dataset.updatedAt.toISOString()}</Text>
      {csv ?
        <DataGrid fields={csv.meta.fields ?? []} data={csv.data ?? []} />
      : null}
    </Container>
  );
}
