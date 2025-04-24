import { Text } from "@mantine/core";

/**
 * A basic component to display error or dangerous text.
 * It's just Mantine's `Text` component with the `danger` color applied.
 */
export function DangerText({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <Text c="danger">{children}</Text>;
}
