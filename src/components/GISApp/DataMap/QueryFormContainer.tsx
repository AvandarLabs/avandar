import { ActionIcon, Flex, Popover, Tooltip } from "@mantine/core";
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
          <Tooltip
            label="Filter"
            multiline
            maw={340}
            color="neutral.8"
            fz="md"
            transitionProps={{ transition: "pop" }}
            style={{
              boxShadow: mantineVar("shadow-lg"),
            }}
          >
            <ActionIcon
              size="lg"
              variant="white"
              color="neutral"
              onClick={toggle}
              style={{
                borderRadius: "50%",
                border: `1px solid ${mantineColorVar("neutral.3")}`,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                transform: isPopoverOpen || hovered ? "scale(1.2)" : "scale(1)",
                boxShadow:
                  isPopoverOpen || hovered ?
                    mantineVar("shadow-lg")
                  : mantineVar("shadow-md"),
              }}
              aria-label="Query form"
            >
              <IconFilter size={20} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <QueryForm withinPortal={false} />
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
