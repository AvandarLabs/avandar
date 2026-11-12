import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  originDatasetName: string | undefined;
  meaningMatchStatus: MeaningMatchStatus;
  onLearnFromMore: () => void;
};

/**
 * What reading the datasets did, in one line, with how to adjust it and
 * whether the search for meaning matches is still running. From a single
 * dataset's menu it offers to learn from more datasets.
 */
export function ReviewSummary({
  proposal,
  originDatasetName,
  meaningMatchStatus,
  onLearnFromMore,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const columnCount = proposal.entries.reduce((sum, entry) => {
    return sum + DictionaryProposal.getColumns(entry).length;
  }, 0);
  const entryCount = proposal.entries.length;
  const datasetCount = DictionaryProposal.getDatasetIds(proposal).length;
  const columns = plural(columnCount, { one: "# column", other: "# columns" });
  const entries = plural(entryCount, { one: "# entry", other: "# entries" });
  const datasets = plural(datasetCount, {
    one: "# dataset",
    other: "# datasets",
  });

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap="xxs" maw={720}>
        <Text fw={600} size="sm">
          {originDatasetName
            ? t`${columns} in ${originDatasetName} became ${entries}.`
            : t`${columns} from ${datasets} became ${entries}.`}
        </Text>
        <Text size="sm" c="dimmed">
          <Trans>
            Coded columns get labeled next. The rest become entries with a
            description, so the dictionary documents them too. Uncheck anything
            you don't want, or change its kind.
          </Trans>
        </Text>
        <div aria-live="polite">
          {meaningMatchStatus === "finding" ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                <Trans>Looking for columns that mean the same thing</Trans>
              </Text>
            </Group>
          ) : null}
          {meaningMatchStatus === "failed" ? (
            <Text size="sm" c="dimmed">
              <Trans>
                Could not look for columns that mean the same thing. The matches
                here are by name and values.
              </Trans>
            </Text>
          ) : null}
        </div>
      </Stack>
      {originDatasetName ? (
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={onLearnFromMore}
        >
          <Trans>Learn from more datasets</Trans>
        </Button>
      ) : null}
    </Group>
  );
}
