import { Container, List } from "@mantine/core";

export function DataImportApp(): JSX.Element {
  return (
    <Container>
      <List type="ordered" withPadding>
        <List.Item>Allow CSV import</List.Item>
        <List.Item>Allow Excel import</List.Item>
      </List>
    </Container>
  );
}
