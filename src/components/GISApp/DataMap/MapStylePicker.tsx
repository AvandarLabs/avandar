import { ActionIcon, Flex, Popover, Stack, Text, Tooltip } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconPalette } from "@tabler/icons-react";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/lib/ui/inputs/SegmentedControl";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";
import { MapStyleKey, MapStyleKeys } from "./mapStyles";

type MapStyle = {
  url: string;
  name: string;
};

type MapStylesRecord = Record<MapStyleKey, MapStyle>;

type Props = {
  mapStyles: MapStylesRecord;
  value?: MapStyleKey;
  onChange?: (value: MapStyleKey) => void;
};

export function MapStylePicker({
  mapStyles,
  value,
  onChange,
}: Props): JSX.Element {
  const [isPopoverOpen, , close, toggle] = useBoolean(false);

  const { hovered, ref } = useHover();
  const items: Array<SegmentedControlItem<MapStyleKey>> = MapStyleKeys.map(
    (styleKey: MapStyleKey) => {
      return {
        value: styleKey,
        label: mapStyles[styleKey]?.name ?? styleKey,
      };
    },
  );

  return (
    <Flex ref={ref} pos="relative" align="center">
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
            label="Theme"
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
              aria-label="Theme picker"
            >
              <IconPalette size={20} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Theme
            </Text>
            <SegmentedControl data={items} value={value} onChange={onChange} />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Flex>
  );
}
