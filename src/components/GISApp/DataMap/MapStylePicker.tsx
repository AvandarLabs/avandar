import { ActionIcon, Box, Flex, Stack, Text, Transition } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconPalette } from "@tabler/icons-react";
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

type MapStylesRecord = Record<string, MapStyle>;

type Props = {
  mapStyles: MapStylesRecord;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

const horizontalExpandTransition = {
  in: { opacity: 1, transform: "scaleX(1)" },
  out: { opacity: 0, transform: "scaleX(0)" },
  common: { transformOrigin: "left" },
  transitionProperty: "opacity, transform",
};

export function MapStylePicker({
  mapStyles,
  value,
  defaultValue,
  onChange,
}: Props): JSX.Element {
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
      <ActionIcon
        size="lg"
        variant="white"
        color="neutral"
        style={{
          borderRadius: "50%",
          border: `1px solid ${mantineColorVar("neutral.3")}`,
          transition: "transform 0.2s ease",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          boxShadow: mantineVar("shadow-md"),
        }}
        aria-label="Theme picker"
      >
        <IconPalette size={20} />
      </ActionIcon>
      <Transition
        mounted={hovered}
        transition={horizontalExpandTransition}
        duration={200}
        timingFunction="ease"
      >
        {(styles) => {
          return (
            <Box
              bg="white"
              p="xs"
              pos="absolute"
              style={{
                ...styles,
                left: "60%",
                top: "60%",
                whiteSpace: "nowrap",
                borderRadius: 4,
                boxShadow:
                  "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
              }}
            >
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Theme
                </Text>
                <SegmentedControl
                  data={items}
                  value={value}
                  defaultValue={defaultValue}
                  onChange={onChange}
                />
              </Stack>
            </Box>
          );
        }}
      </Transition>
    </Flex>
  );
}
