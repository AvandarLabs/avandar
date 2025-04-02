import { Container, Stack, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import * as LocalDataset from "@/models/LocalDataset";
import { DataGrid } from "../ui/DataGrid";
import { DescriptionList } from "../ui/DescriptionListItem/DescriptionList";
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
      <Stack>
        <Title order={2}>{dataset.name}</Title>
        <Text>{dataset.description}</Text>

        <DescriptionList>
          <DescriptionList.Item
            label="Delimiter"
            children={dataset.delimiter}
          />
          <DescriptionList.Item
            label="First row is header"
            children={dataset.firstRowIsHeader ? "Yes" : "No"}
          />
          <DescriptionList.Item label="File type" children={dataset.mimeType} />
          <DescriptionList.Item
            label="Size in bytes"
            children={dataset.sizeInBytes}
          />
          <DescriptionList.Item
            label="Created at"
            children={dataset.createdAt.toISOString()}
          />
          <DescriptionList.Item
            label="Last updated"
            children={dataset.updatedAt.toISOString()}
          />
        </DescriptionList>

        {csv ?
          <DataGrid fields={csv.meta.fields ?? []} data={csv.data ?? []} />
        : null}
      </Stack>
    </Container>
  );
}
