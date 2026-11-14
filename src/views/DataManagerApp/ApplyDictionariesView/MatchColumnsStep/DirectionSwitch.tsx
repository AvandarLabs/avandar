import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ReactNode } from "react";

type Props = {
  direction: DictionaryBinding.Direction;
  /** Whether the direction was read from the data rather than chosen. */
  isFromData: boolean;
  onChange: (direction: DictionaryBinding.Direction) => void;
};

/**
 * Which way a converted column is translated: Codes → labels or
 * Labels → codes, with "Chosen from the data" until the user picks.
 */
export function DirectionSwitch({
  direction,
  isFromData,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const options = [
    { value: "decode", label: t`Codes → labels` },
    { value: "encode", label: t`Labels → codes` },
  ] as const;
  return (
    <Stack gap={4}>
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
      {isFromData ? (
        <Text size="xs" c="dimmed">
          <Trans>Chosen from the data</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
