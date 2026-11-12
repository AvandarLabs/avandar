import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { MeaningMatchStatusLine } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/MeaningMatchStatusLine";
import { useReviewHeadline } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/useReviewHeadline";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
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
  const headline = useReviewHeadline(proposal, originDatasetName);

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap="xxs" maw={720}>
        <Text fw={600} size="sm">
          {headline}
        </Text>
        <Text size="sm" c="dimmed">
          <Trans>
            Coded columns get labeled next. The rest become entries with a
            description, so the dictionary documents them too. Uncheck anything
            you don't want, or change its kind.
          </Trans>
        </Text>
        <MeaningMatchStatusLine status={meaningMatchStatus} />
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
