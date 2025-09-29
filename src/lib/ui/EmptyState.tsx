import { Text } from "@mantine/core";
import { JSX } from "react";

export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <Text size="md" fs="italic" py="sm">
      {message}
    </Text>
  );
}
