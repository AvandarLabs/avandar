import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsStep.module.css";
import { hasWrittenDescription } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/describeEntriesHelpers";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { SuggestDescriptionsOptions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestDescriptions";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** This entry's suggestion is waiting for the model. */
  isPending: boolean;
  /** Suggestions are off, or one is running, so none can start now. */
  isOff: boolean;
  onSuggest: (options: SuggestDescriptionsOptions) => void;
};

/**
 * Suggests a description for one entry. An empty box fills right away. When
 * the user has written something, a short note first says the suggestion
 * uses it and may rewrite it, and waits for them to confirm.
 */
export function SuggestEntryButton({
  entry,
  isPending,
  isOff,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [isConfirming, setIsConfirming] = useState(false);
  const entryName = entry.name;

  function suggest(): void {
    setIsConfirming(false);
    onSuggest({ entryKeys: [entry.key], rewritableEntryKeys: [entry.key] });
  }

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
          aria-label={t`Suggest a description for ${entryName}`}
          loading={isPending}
          disabled={isOff && !isPending}
          onClick={() => {
            if (hasWrittenDescription(entry)) {
              setIsConfirming(true);
            } else {
              suggest();
            }
          }}
        >
          <Trans>Suggest</Trans>
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm" className={css.describeConfirm}>
          <Text size="sm">
            <Trans>
              The suggestion uses what you wrote and may rewrite it.
            </Trans>
          </Text>
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
            <Button size="compact-sm" onClick={suggest}>
              <Trans>Suggest and rewrite</Trans>
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
