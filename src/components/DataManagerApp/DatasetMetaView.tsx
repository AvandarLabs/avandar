import { Container, Text, Title } from "@mantine/core";
import * as LocalDataset from "@/models/LocalDataset";

type Props = {
  dataset: LocalDataset.T;
};

export function DatasetMetaView({ dataset }: Props): JSX.Element {
  // const { csv } = useCSV();
  console.log("the data", dataset.data);
  return (
    <Container>
      <Title order={2}>{dataset.name}</Title>
      <Text>{dataset.description}</Text>
    </Container>
  );
}
