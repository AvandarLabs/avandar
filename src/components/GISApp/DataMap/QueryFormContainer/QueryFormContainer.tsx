import { ActionIcon, Flex, Popover, Stack } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { useState } from "react";
import { QueryColumnMultiSelect } from "@/components/DataExplorerApp/QueryColumnMultiSelect";
import { QueryDataSourceSelect } from "@/components/DataExplorerApp/QueryDataSourceSelect";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { AvaTooltip } from "@/lib/ui/AvaTooltip";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";
import { Models } from "@/models/Model/Models";
import { QueryColumn } from "@/models/queries/QueryColumn";
import { QueryDataSource } from "@/models/queries/QueryDataSource";

export function QueryFormContainer(): JSX.Element {
  const [isPopoverOpen, , close, toggle] = useBoolean(false);
  const { hovered, ref } = useHover();
  const [selectedDataSource, setSelectedDataSource] =
    useState<QueryDataSource | null>(null);
  const [latitudeColumn, setLatitudeColumn] = useState<readonly QueryColumn[]>(
    [],
  );
  const [longitudeColumn, setLongitudeColumn] = useState<
    readonly QueryColumn[]
  >([]);

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
          <AvaTooltip label="Filter" position="right">
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
          </AvaTooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Stack gap="md">
            <QueryDataSourceSelect
              value={selectedDataSource}
              onChange={setSelectedDataSource}
              comboboxProps={{ withinPortal: false }}
            />
            <QueryColumnMultiSelect
              label="Latitude column"
              placeholder="Select latitude column"
              dataSourceId={
                selectedDataSource ?
                  Models.getTypedId(selectedDataSource)
                : undefined
              }
              value={latitudeColumn}
              onChange={setLatitudeColumn}
              comboboxProps={{ withinPortal: false }}
            />
            <QueryColumnMultiSelect
              label="Longitude column"
              placeholder="Select longitude column"
              dataSourceId={
                selectedDataSource ?
                  Models.getTypedId(selectedDataSource)
                : undefined
              }
              value={longitudeColumn}
              onChange={setLongitudeColumn}
              comboboxProps={{ withinPortal: false }}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
