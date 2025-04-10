import { Container, Stack, TextInput } from "@mantine/core";

export function EntityCreator(): JSX.Element {
  return (
    <Container pt="lg">
      <Stack>
        <TextInput
          required
          label="Entity Name (should be a combo box)"
          placeholder="Enter a name for the entity"
        />
        <TextInput
          label="Entity Description"
          placeholder="Enter a description for the entity"
        />
        <TextInput label="Fields" placeholder="Enter the fields" />
        <TextInput
          label="Title field"
          placeholder="Enter the field name that will be used as the label"
        />
        <TextInput
          label="ID field"
          placeholder="Enter the field name that will be used as the ID"
        />
      </Stack>
    </Container>
  );
}
