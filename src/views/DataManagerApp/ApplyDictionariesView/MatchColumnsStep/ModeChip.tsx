import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { useId } from "react";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { ReactNode } from "react";

type Props = {
  mode: DictionaryBinding.Mode;
  /** The id of the column name this chip is for. */
  nameId: string;
  copy: ConversionCopy;
  onToggle: () => void;
};

/**
 * A row's Values chip: Convert or Reference only, switching to the other
 * on click. Its name is what it shows; the column and what a click does
 * are its description. Switching to Convert is inert, and says why, when
 * nothing in the dataset can be converted.
 */
export function ModeChip({
  mode,
  nameId,
  copy,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const hintId = useId();
  const isConverting = mode === "convert";
  const isLocked = !isConverting && copy.convertUnavailable !== undefined;
  const hint = isConverting
    ? t`Click to attach as reference only instead.`
    : (copy.convertUnavailable ?? t`Click to convert instead.`);
  const tooltip = (
    <Stack gap={4}>
      <Text size="xs">
        {isConverting ? copy.convertTooltip : copy.referenceTooltip}
      </Text>
      <Text size="xs">{hint}</Text>
    </Stack>
  );
  return (
    <>
      <Tooltip multiline maw={320} label={tooltip}>
        <UnstyledButton
          className={css.modeChip}
          data-mode={mode}
          aria-describedby={`${nameId} ${hintId}`}
          aria-disabled={isLocked || undefined}
          onClick={() => {
            if (!isLocked) {
              onToggle();
            }
          }}
        >
          {isConverting ? (
            <Trans>Convert</Trans>
          ) : (
            <Trans>Reference only</Trans>
          )}
        </UnstyledButton>
      </Tooltip>
      <VisuallyHidden id={hintId}>{hint}</VisuallyHidden>
    </>
  );
}
