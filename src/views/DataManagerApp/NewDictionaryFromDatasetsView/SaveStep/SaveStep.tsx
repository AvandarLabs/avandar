import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { SaveApplyNextField } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveApplyNextField";
import { SaveFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveFooter";
import { SaveNameFields } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveNameFields";
import { SaveSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveSummary";
import { SaveWarnings } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveWarnings";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  name: string;
  description: string;
  originDatasetName: string | undefined;
  learnedFromNames: readonly string[];
  appliesNext: boolean;
  applyTargets: readonly ApplyTarget[];
  isCreating: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onCreate: () => void;
};

/**
 * The last step of learning a dictionary: name it, check what will be
 * saved, and create it. Creating needs a connection; every step before it
 * works offline.
 */
export function SaveStep(props: Readonly<Props>): ReactNode {
  const { proposal, labels, dispatch } = props;
  const draft = useMemo(() => {
    return DictionaryProposal.toDraft({ proposal, labels });
  }, [proposal, labels]);
  const issues = useMemo(() => {
    return DataDictionary.findDraftIssues(draft);
  }, [draft]);
  const canCreate =
    issues.length === 0 && draft.entries.length > 0 && props.name.trim() !== "";

  return (
    <>
      <AppViewBody contentMaxWidth={720}>
        <Stack gap="xl">
          <SaveNameFields
            name={props.name}
            description={props.description}
            originDatasetName={props.originDatasetName}
            dispatch={dispatch}
          />
          <SaveSummary
            draft={draft}
            proposal={proposal}
            labels={labels}
            learnedFromNames={props.learnedFromNames}
          />
          <SaveWarnings
            draft={draft}
            issues={issues}
            proposal={proposal}
            labels={labels}
          />
          <SaveApplyNextField
            appliesNext={props.appliesNext}
            applyTargets={props.applyTargets}
            dispatch={dispatch}
          />
        </Stack>
      </AppViewBody>
      <SaveFooter
        canCreate={canCreate}
        isCreating={props.isCreating}
        dispatch={dispatch}
        onCreate={props.onCreate}
      />
    </>
  );
}
