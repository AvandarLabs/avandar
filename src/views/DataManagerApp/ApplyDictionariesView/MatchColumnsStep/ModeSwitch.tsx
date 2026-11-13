import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { useId } from "react";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { ReactNode } from "react";

type Props = {
  mode: DictionaryBinding.Mode;
  copy: ConversionCopy;
  onChange: (mode: DictionaryBinding.Mode) => void;
};

function ModeButton(
  props: Readonly<{
    label: string;
    tooltip: string;
    isSelected: boolean;
    isLocked: boolean;
    onSelect: () => void;
  }>,
): ReactNode {
  return (
    <Tooltip multiline maw={280} position="bottom" label={props.tooltip}>
      <Button
        variant={props.isSelected ? "light" : "default"}
        justify="flex-start"
        fullWidth
        aria-pressed={props.isSelected}
        aria-disabled={props.isLocked || undefined}
        data-disabled={props.isLocked || undefined}
        onClick={() => {
          if (!props.isLocked) {
            props.onSelect();
          }
        }}
      >
        {props.label}
      </Button>
    </Tooltip>
  );
}

/**
 * How to apply the dictionary to the selected column: Apply conversions or
 * Attach labels only as reference, each with its tooltip, then what the
 * choice does to the data.
 */
export function ModeSwitch({
  mode,
  copy,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  return (
    <Stack gap={6}>
      <Text id={labelId} size="xs" fw={600} c="dimmed">
        <Trans>How to apply the dictionary</Trans>
      </Text>
      <Button.Group orientation="vertical" aria-labelledby={labelId}>
        <ModeButton
          label={t`Apply conversions`}
          tooltip={copy.convertUnavailable ?? copy.convertTooltip}
          isSelected={mode === "convert"}
          isLocked={copy.convertUnavailable !== undefined}
          onSelect={() => {
            onChange("convert");
          }}
        />
        <ModeButton
          label={t`Attach labels only as reference`}
          tooltip={copy.referenceTooltip}
          isSelected={mode === "reference"}
          isLocked={false}
          onSelect={() => {
            onChange("reference");
          }}
        />
      </Button.Group>
      <Text size="xs" c="dimmed">
        {mode === "convert"
          ? copy.convertExplanation
          : copy.referenceExplanation}
      </Text>
    </Stack>
  );
}
