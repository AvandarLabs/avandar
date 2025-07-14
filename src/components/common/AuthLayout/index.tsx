import { Container, Stack, Text, Title } from "@mantine/core";
import { ReactNode } from "react";
import { PaperWrapper } from "@/lib/ui/PaperWrapper";

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: Props): JSX.Element {
  return (
    <Container size={420} py="xxl">
      <Stack>
        <Title ta="center" order={1}>
          {title}
        </Title>

        {subtitle ?
          <Text ta="center" className="space-x-2" c="dimmed">
            {subtitle}
          </Text>
        : null}

        <PaperWrapper>{children}</PaperWrapper>
      </Stack>
    </Container>
  );
}
