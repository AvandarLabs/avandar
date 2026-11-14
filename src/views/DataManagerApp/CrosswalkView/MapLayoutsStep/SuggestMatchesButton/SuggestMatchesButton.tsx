import { plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { useId } from "@mantine/hooks";
import { IconSparkles } from "@tabler/icons-react";
import { MeaningMatchStatusLine } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/MeaningMatchStatusLine";
import type { CrosswalkMeaningMatches } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches";
import type { ReactNode } from "react";

type Props = {
  meaningMatches: CrosswalkMeaningMatches;
};

/** Why Suggest matches is off, or what the last search found, or nothing. */
function _getNote(meaningMatches: CrosswalkMeaningMatches): ReactNode {
  const { availability, canSuggest, status, foundCount } = meaningMatches;
  if (availability === "unavailable") {
    return (
      <Trans>
        Suggestions need a connection or the offline model. Mapping still works.
      </Trans>
    );
  }
  if (availability === "declined") {
    return (
      <Trans>
        You chose not to send column names to the AI provider, so suggestions
        are off for this crosswalk. Mapping still works.
      </Trans>
    );
  }
  if (status === "done" && foundCount !== undefined) {
    return foundCount === 0 ? (
      <Trans>No other matches found.</Trans>
    ) : (
      plural(foundCount, {
        one: "Found # more match. It's marked Suggested.",
        other: "Found # more matches. They're marked Suggested.",
      })
    );
  }
  if (!canSuggest && status !== "finding") {
    return <Trans>Nothing is left to match in this dataset.</Trans>;
  }
  return null;
}

/**
 * Step 2's Suggest matches: asks the suggestion model for the layout's
 * columns that mean the combined dataset's unfilled ones, under names the
 * scorer cannot match. Off, with the reason beside it, when no model can
 * answer, the user declined, or nothing is left to ask about. The search's
 * progress and failure are read out politely.
 */
export function SuggestMatchesButton({
  meaningMatches,
}: Readonly<Props>): ReactNode {
  const noteId = useId();
  const note = _getNote(meaningMatches);
  const isFinding = meaningMatches.status === "finding";
  return (
    <Group gap="xs" wrap="nowrap" miw={0}>
      <MeaningMatchStatusLine status={meaningMatches.status} />
      <div aria-live="polite">
        {note ? (
          <Text id={noteId} size="xs" c="dimmed">
            {note}
          </Text>
        ) : null}
      </div>
      <Button
        variant="default"
        leftSection={<IconSparkles size={14} aria-hidden />}
        loading={isFinding}
        disabled={!meaningMatches.canSuggest || isFinding}
        aria-describedby={note ? noteId : undefined}
        onClick={meaningMatches.suggestMatches}
      >
        <Trans>Suggest matches</Trans>
      </Button>
    </Group>
  );
}
