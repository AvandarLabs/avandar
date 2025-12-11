import { Container, Stack, Text, Title } from "@mantine/core";
import { ReactNode } from "react";
import { Paper } from "@/lib/ui/Paper";

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: Props): JSX.Element {
  return (
    <Container size={512} py="xxl">
      <Stack>
        <Title ta="center" order={1}>
          {title}
        </Title>

        {subtitle ?
          <Text ta="center" className="space-x-2" c="dimmed">
            {subtitle}
          </Text>
        : null}

        <Paper>{children}</Paper>

        {footer ? footer : null}
      </Stack>
    </Container>
  );
}
