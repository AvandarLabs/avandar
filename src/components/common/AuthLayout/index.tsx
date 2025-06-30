import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: Props): JSX.Element {
  return (
    <Container size={420} my="xxl">
      <Stack>
        <Title ta="center" order={1}>
          {title}
        </Title>

        {subtitle ?
          <Text ta="center" className="space-x-2" c="dimmed">
            {subtitle}
          </Text>
        : null}

        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          {children}
        </Paper>
      </Stack>
    </Container>
  );
}
