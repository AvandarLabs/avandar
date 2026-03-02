import { ActionIcon, ColorInput, Flex, Popover, Stack } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { AvaTooltip } from "@/lib/ui/AvaTooltip";
import { notifyError } from "@/lib/ui/notifications/notify";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";
import { Models } from "@/models/Model/Models";
import { QueryColumn } from "@/models/queries/QueryColumn";
import { QueryColumns } from "@/models/queries/QueryColumn/QueryColumns";
import { QueryDataSource } from "@/models/queries/QueryDataSource";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";

type Props = {
  selectedDataSource?: QueryDataSource;
  onSelectedDataSourceChange: (dataSource: QueryDataSource | undefined) => void;
  latitudeColumn?: QueryColumn;
  onLatitudeColumnChange: (column: QueryColumn | undefined) => void;
  longitudeColumn?: QueryColumn;
  onLongitudeColumnChange: (column: QueryColumn | undefined) => void;
  symbolSizeColumn?: QueryColumn;
  onSymbolSizeColumnChange: (column: QueryColumn | undefined) => void;
  symbolColor?: string;
  onSymbolColorChange: (color: string | undefined) => void;
};

export function QueryFormContainer({
  selectedDataSource,
  onSelectedDataSourceChange,
  latitudeColumn,
  onLatitudeColumnChange,
  longitudeColumn,
  onLongitudeColumnChange,
  symbolSizeColumn,
  onSymbolSizeColumnChange,
  symbolColor,
  onSymbolColorChange,
}: Props): JSX.Element {
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
        withinPortal={false}
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
              value={selectedDataSource ?? null}
              onChange={(value) => {
                onSelectedDataSourceChange(value ?? undefined);
              }}
              comboboxProps={{ withinPortal: false }}
            />
            <QueryColumnSingleSelect
              label="Latitude column"
              placeholder="Select latitude column"
              dataSourceId={
                selectedDataSource ?
                  Models.getTypedId(selectedDataSource)
                : undefined
              }
              value={latitudeColumn ?? null}
              onChange={(value) => {
                onLatitudeColumnChange(value ?? undefined);
              }}
              comboboxProps={{ withinPortal: false }}
            />
            <QueryColumnSingleSelect
              label="Longitude column"
              placeholder="Select longitude column"
              dataSourceId={
                selectedDataSource ?
                  Models.getTypedId(selectedDataSource)
                : undefined
              }
              value={longitudeColumn ?? null}
              onChange={(value) => {
                onLongitudeColumnChange(value ?? undefined);
              }}
              comboboxProps={{ withinPortal: false }}
            />
            <QueryColumnSingleSelect
              label="Symbol size"
              placeholder="Select symbol size column"
              dataSourceId={
                selectedDataSource ?
                  Models.getTypedId(selectedDataSource)
                : undefined
              }
              value={symbolSizeColumn ?? null}
              onChange={(value) => {
                if (value && !QueryColumns.isNumeric(value)) {
                  notifyError({
                    title: "Invalid column type",
                    message: "Symbol size column must be numeric.",
                  });
                  return;
                }
                onSymbolSizeColumnChange(value ?? undefined);
              }}
              comboboxProps={{ withinPortal: false }}
            />
            <ColorInput
              label="Symbol color"
              value={symbolColor ?? "#3b82f6"}
              onChange={(value) => {
                onSymbolColorChange(value || undefined);
              }}
              popoverProps={{
                withinPortal: false,
              }}
              format="hex"
              swatches={[
                "#3b82f6",
                "#ef4444",
                "#10b981",
                "#f59e0b",
                "#8b5cf6",
                "#ec4899",
                "#06b6d4",
                "#84cc16",
              ]}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
