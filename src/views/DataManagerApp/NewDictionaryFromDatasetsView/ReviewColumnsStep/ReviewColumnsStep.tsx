import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import { ReviewSections } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewSections";
import { ReviewSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewSummary";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  originDatasetName: string | undefined;
  meaningMatchStatus: MeaningMatchStatus;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The second step of learning a dictionary: what reading the datasets
 * proposed, ready to adjust before labeling. Back to Pick is offered only
 * when the flow started there. Next waits until every included entry has a
 * name the save will accept.
 */
export function ReviewColumnsStep({
  proposal,
  originDatasetName,
  meaningMatchStatus,
  dispatch,
}: Readonly<Props>): ReactNode {
  const hasIncludedEntry = proposal.entries.some((entry) => {
    return entry.isIncluded;
  });
  const nameIssues = useMemo(() => {
    return DictionaryProposal.getEntryNameIssues(proposal);
  }, [proposal]);
  const hasNameIssue = nameIssues.size > 0;
  return (
    <AppViewBody>
      <Stack gap="xl">
        <ReviewSummary
          proposal={proposal}
          originDatasetName={originDatasetName}
          meaningMatchStatus={meaningMatchStatus}
          onLearnFromMore={() => {
            dispatch({ type: "learn_from_more" });
          }}
        />
        <ReviewSections
          proposal={proposal}
          nameIssues={nameIssues}
          dispatch={dispatch}
        />
      </Stack>
      <NewDictionaryFooter
        start={
          originDatasetName ? null : (
            <Button
              variant="default"
              onClick={() => {
                dispatch({ type: "go_to_step", step: "pick" });
              }}
            >
              <Trans>Back</Trans>
            </Button>
          )
        }
      >
        {hasNameIssue ? (
          <Text size="sm" c="dimmed">
            <Trans>Fix the entry names marked above to go on.</Trans>
          </Text>
        ) : null}
        <Button
          disabled={!hasIncludedEntry || hasNameIssue}
          onClick={() => {
            dispatch({ type: "go_to_step", step: "label" });
          }}
        >
          <Trans>Next: label values</Trans>
        </Button>
      </NewDictionaryFooter>
    </AppViewBody>
  );
}
