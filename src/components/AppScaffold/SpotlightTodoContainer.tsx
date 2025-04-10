import { Container, List, Stack, Title } from "@mantine/core";
import { Fragment } from "react";
import { TODOS } from "@/config/todos";

export function SpotlightTodoContainer(): JSX.Element | null {
  if (import.meta.env.DEV) {
    return (
      <Container>
        <Stack>
          {TODOS?.map(({ label, items }) => {
            return (
              <Fragment key={label}>
                <Title order={4}>{label}</Title>
                <List type="ordered" withPadding>
                  {items.map((todoItem) => {
                    return <List.Item key={todoItem}>{todoItem}</List.Item>;
                  })}
                </List>
              </Fragment>
            );
          })}
        </Stack>
      </Container>
    );
  }
  return null;
}
