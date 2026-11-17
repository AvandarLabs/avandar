import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { ReviewColumnsFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsFooter";
import { ReviewEntriesTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesTable";
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
 * when the flow started there. Next waits until something is included and
 * every included entry has a name the save will accept.
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

  return (
    <>
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
          <ReviewEntriesTable
            proposal={proposal}
            nameIssues={nameIssues}
            dispatch={dispatch}
          />
        </Stack>
      </AppViewBody>
      <ReviewColumnsFooter
        hasBack={!originDatasetName}
        hasIncludedEntry={hasIncludedEntry}
        hasNameIssue={nameIssues.size > 0}
        dispatch={dispatch}
      />
    </>
  );
}
