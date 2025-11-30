import { ActionIcon, Flex, Popover } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { QueryForm } from "@/components/DataExplorerApp/QueryForm";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";

export function QueryFormContainer(): JSX.Element {
  const [isPopoverOpen, , close, toggle] = useBoolean(false);
  const { hovered, ref } = useHover();

  return (
    <Flex ref={ref} pos="relative" align="center" mt="xs">
      <Popover
        opened={isPopoverOpen}
        onChange={toggle}
        onDismiss={close}
        position="bottom-start"
        offset={8}
        transitionProps={{
          transition: "pop-top-left",
          duration: 200,
          timingFunction: "ease-out",
        }}
        shadow="md"
      >
        <Popover.Target>
          <ActionIcon
            size="lg"
            variant="white"
            color="neutral"
            onClick={toggle}
            style={{
              borderRadius: "50%",
              border: `1px solid ${mantineColorVar("neutral.3")}`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              transform:
                hovered ? "scale(1.1)"
                : isPopoverOpen ? "scale(0.95)"
                : "scale(1)",
              boxShadow:
                hovered ? mantineVar("shadow-lg")
                : isPopoverOpen ? mantineVar("shadow-sm")
                : mantineVar("shadow-md"),
            }}
            aria-label="Query form"
          >
            <IconFilter size={20} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <QueryForm withinPortal={false} />
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
