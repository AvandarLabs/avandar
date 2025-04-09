import { Container, List, Stack, Title } from "@mantine/core";
import { TODOS } from "@/config/todos";

export function SpotlightTodoContainer(): JSX.Element | null {
  if (import.meta.env.DEV) {
    return (
      <Container>
        <Stack>
          {TODOS?.map(({ label, items }) => {
            return (
              <>
                <Title order={4}>{label}</Title>
                <List type="ordered" withPadding>
                  {items.map((todoItem) => {
                    return <List.Item key={todoItem}>{todoItem}</List.Item>;
                  })}
                </List>
              </>
            );
          })}
        </Stack>
      </Container>
    );
  }
  return null;
}
