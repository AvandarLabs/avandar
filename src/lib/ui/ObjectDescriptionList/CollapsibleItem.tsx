import { Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { clsx } from "clsx";
import { ReactNode } from "react";
import { useToggleBoolean } from "@/lib/hooks/state/useToggleBoolean";

type Props = {
  children: ReactNode;

  /**
   * The starting open or closed state of the item.
   * Defaults to `false`.
   */
  defaultOpen?: boolean;

  /**
   * The label to display for the item.
   */
  label: ReactNode;
};

export function CollapsibleItem({
  label,
  children,
  defaultOpen = false,
}: Props): JSX.Element {
  const [isOpened, toggle] = useToggleBoolean(defaultOpen);
  const chevronClassName = clsx("transition-transform", {
    "rotate-90": isOpened,
    "rotate-0": !isOpened,
  });

  return (
    <Box>
      <UnstyledButton
        px="sm"
        py="xs"
        w="100%"
        variant="default"
        c="black"
        onClick={toggle}
        className="hover:bg-neutral-50"
      >
        <Group>
          <Text span fw={isOpened ? "bold" : undefined}>
            {label}
          </Text>
          <IconChevronRight size="1rem" className={chevronClassName} />
        </Group>
      </UnstyledButton>

      <Collapse in={isOpened} px="sm">
        {children}
      </Collapse>
    </Box>
  );
}
