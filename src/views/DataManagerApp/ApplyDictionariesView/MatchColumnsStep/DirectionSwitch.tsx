import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { ValueSideHint } from "@/components/dataDictionaries/ValueSideHint/ValueSideHint";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ReactNode } from "react";

type Props = {
  direction: DictionaryBinding.Direction;
  /** Whether the direction was read from the data rather than chosen. */
  isFromData: boolean;
  onChange: (direction: DictionaryBinding.Direction) => void;
};

/**
 * Which way a converted column is translated: Source → Target or
 * Target → Source, with "Chosen from the data" until the user picks. An
 * info icon defines the two sides.
 */
export function DirectionSwitch({
  direction,
  isFromData,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const options = [
    { value: "decode", label: t`Source → Target` },
    { value: "encode", label: t`Target → Source` },
  ] as const;
  return (
    <Stack gap={4}>
      <Group gap={4} wrap="nowrap">
        <Button.Group aria-label={t`Which way to convert`}>
          {options.map((option) => {
            const isSelected = option.value === direction;
            return (
              <Button
                key={option.value}
                size="xs"
                variant={isSelected ? "light" : "default"}
                aria-pressed={isSelected}
                onClick={() => {
                  onChange(option.value);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </Button.Group>
        <ValueSideHint side="both" />
      </Group>
      {isFromData ? (
        <Text size="xs" c="dimmed">
          <Trans>Chosen from the data</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
