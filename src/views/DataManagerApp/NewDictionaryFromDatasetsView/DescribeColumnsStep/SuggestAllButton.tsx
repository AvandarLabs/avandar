import { Trans } from "@lingui/react/macro";
import { Button, Checkbox, Group, Popover, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsStep.module.css";
import { hasWrittenDescription } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/describeEntriesHelpers";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { SuggestDescriptionsOptions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestDescriptions";
import type { ReactNode } from "react";

type Props = {
  /** The included entries, in the order they are listed. */
  entries: readonly DictionaryProposal.Entry[];
  /** Suggestions are off, or one is running, so none can start now. */
  isOff: boolean;
  onSuggest: (options: SuggestDescriptionsOptions) => void;
};

/**
 * Suggests a description for every included entry. When none has a
 * description it runs right away. When some do, a small confirm lists them
 * with checkboxes: checked ones may be rewritten, unchecked ones are not
 * sent. Empty entries are always filled.
 */
export function SuggestAllButton({
  entries,
  isOff,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const writtenEntries = entries.filter(hasWrittenDescription);
  const [isConfirming, setIsConfirming] = useState(false);
  const [rewritableKeys, setRewritableKeys] = useState<readonly string[]>([]);

  function suggest(rewritableEntryKeys: readonly string[]): void {
    setIsConfirming(false);
    onSuggest({
      entryKeys: entries
        .filter((entry) => {
          return (
            !hasWrittenDescription(entry) ||
            rewritableEntryKeys.includes(entry.key)
          );
        })
        .map((entry) => {
          return entry.key;
        }),
      rewritableEntryKeys,
    });
  }

  function toggleKey(entryKey: string, isChecked: boolean): void {
    setRewritableKeys((current) => {
      return isChecked
        ? [...current, entryKey]
        : current.filter((key) => {
            return key !== entryKey;
          });
    });
  }

  const entryCountToSend =
    entries.length - writtenEntries.length + rewritableKeys.length;

  return (
    <Popover
      opened={isConfirming}
      onChange={setIsConfirming}
      position="bottom-end"
      trapFocus
      returnFocus
      withArrow
    >
      <Popover.Target>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconSparkles size={14} aria-hidden />}
          disabled={isOff || entries.length === 0}
          onClick={() => {
            if (writtenEntries.length === 0) {
              suggest([]);
              return;
            }
            setRewritableKeys(
              writtenEntries.map((entry) => {
                return entry.key;
              }),
            );
            setIsConfirming(true);
          }}
        >
          <Trans>Suggest all</Trans>
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm" className={css.describeConfirm}>
          <Text size="sm">
            <Trans>
              Some columns already have a description. Checked ones may be
              rewritten, using what you wrote. Uncheck any you want to keep as
              they are.
            </Trans>
          </Text>
          <Stack gap="xs" className={css.describeConfirmEntries}>
            {writtenEntries.map((entry) => {
              return (
                <Checkbox
                  key={entry.key}
                  label={entry.name}
                  checked={rewritableKeys.includes(entry.key)}
                  onChange={(event) => {
                    toggleKey(entry.key, event.currentTarget.checked);
                  }}
                />
              );
            })}
          </Stack>
          <Group gap="xs" justify="flex-end">
            <Button
              variant="default"
              size="compact-sm"
              onClick={() => {
                setIsConfirming(false);
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              size="compact-sm"
              disabled={entryCountToSend === 0}
              onClick={() => {
                suggest(rewritableKeys);
              }}
            >
              {rewritableKeys.length > 0 ? (
                <Trans>Suggest and rewrite</Trans>
              ) : (
                <Trans>Suggest</Trans>
              )}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
