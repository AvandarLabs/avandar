import { Group, Loader, Paper, Text, Transition } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  visible: boolean;
};

export function FloatingLoader({ label, visible }: Props): JSX.Element {
  return (
    <Transition mounted={visible} transition="fade-up">
      {(transitionStyle) => {
        return (
          <Paper
            bg="white"
            pos="fixed"
            bd="1px solid neutral.2"
            bdrs="md"
            shadow="md"
            p="xs"
            mx="auto"
            left={0}
            right={0}
            w="fit-content"
            bottom={0}
            mb="md"
            style={{ ...transitionStyle, zIndex: 1000 }}
          >
            <Group align="center" justify="center" gap="xs">
              <Text span c="neutral.7">
                {label}
              </Text>
              <Loader size="sm" type="dots" />
            </Group>
          </Paper>
        );
      }}
    </Transition>
  );
}
