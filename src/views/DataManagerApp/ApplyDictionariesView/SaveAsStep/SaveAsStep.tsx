import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { isConvertingPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import { SaveFooter } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveFooter";
import {
  buildSaveRequest,
  getSaveBlocker,
} from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/saveRequest";
import { SaveSummaryTable } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveSummaryTable";
import { SaveTargetCards } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveTargetCards";
import { useDefaultLinkedName } from "@/views/DataManagerApp/ApplyDictionariesView/useDefaultLinkedName";
import { useSaveApply } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ApplySaveRequest } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  existingBindings: readonly DictionaryBinding.T[];
  flow: ApplyFlow;
  counts: ApplyCounts;
  lookups: ApplyLookups;
  summary: string;
  /** The preview drawer, between the body and the footer. */
  preview: ReactNode;
};

/** The primary button's words for a request. */
function useSaveLabel(
  datasetName: string,
  request: ApplySaveRequest | undefined,
): string {
  const { t } = useLingui();
  switch (request?.kind) {
    case "linked":
      return t`Create linked dataset`;
    case "in_place": {
      const convertedCount = request.bindings.filter((binding) => {
        return binding.mode === "convert";
      }).length;
      return plural(convertedCount, {
        one: "Change # column",
        other: "Change # columns",
      });
    }
    case "update_linked":
      return t`Update ${datasetName}`;
    default:
      return t`Save`;
  }
}

function UpdateLinkedSection({
  datasetName,
}: Readonly<{ datasetName: string }>): ReactNode {
  const { t } = useLingui();
  return (
    <AppViewSection title={t`Update ${datasetName}`}>
      <Text size="sm" maw="72ch">
        <Trans>
          Its conversions follow the dictionaries, so later edits to them show
          up here right away.
        </Trans>
      </Text>
    </AppViewSection>
  );
}

/** A loader until the targets are known, then the cards or the update. */
function SaveTargetSection(
  props: Readonly<Props & { linkedDatasetName: string }>,
): ReactNode {
  const { t } = useLingui();
  const { dataset, flow } = props;
  const { targets } = flow;
  if (!targets) {
    return (
      <Center role="status" aria-label={t`Loading save options`} py="lg">
        <Loader size="sm" />
      </Center>
    );
  }
  if (targets.isLinkedDataset) {
    return <UpdateLinkedSection datasetName={dataset.name} />;
  }
  return (
    <SaveTargetCards
      dataset={dataset}
      targets={targets}
      state={flow.state}
      linkedDatasetName={props.linkedDatasetName}
      dispatch={flow.dispatch}
    />
  );
}

function SaveAsBody(
  props: Readonly<
    Props & { linkedDatasetName: string; isLinkedTarget: boolean }
  >,
): ReactNode {
  const { dataset, flow } = props;
  const { state } = flow;
  return (
    <AppViewBody>
      <Stack gap="xl">
        <SaveTargetSection {...props} />
        <AppViewSection title={<Trans>Summary</Trans>} meta={props.summary}>
          <SaveSummaryTable
            datasetName={dataset.name}
            columns={props.columns}
            picks={state.picks}
            existingBindings={props.existingBindings}
            lookups={props.lookups}
            isLinkedTarget={props.isLinkedTarget}
          />
        </AppViewSection>
      </Stack>
    </AppViewBody>
  );
}

function ConvertingSave(props: Readonly<Props>): ReactNode {
  const { dataset, flow } = props;
  const { state, targets } = flow;
  const defaultName = useDefaultLinkedName(dataset.name, state.picks);
  const linkedDatasetName = state.linkedDatasetName ?? defaultName;
  const request = buildSaveRequest({
    state,
    columns: props.columns,
    unmatched: flow.unmatched,
    codeLists: props.lookups.codeLists,
    isLinkedDataset: targets?.isLinkedDataset ?? false,
    linkedDatasetName,
  });
  const blocker = getSaveBlocker({
    request,
    targets,
    hasConfirmedWorkspaceChange: state.hasConfirmedWorkspaceChange,
  });
  const label = useSaveLabel(dataset.name, request);
  const [save, isSaving] = useSaveApply(dataset);
  return (
    <>
      <SaveAsBody
        {...props}
        linkedDatasetName={linkedDatasetName}
        isLinkedTarget={request?.kind === "linked"}
      />
      {props.preview}
      <SaveFooter
        label={label}
        isDisabled={blocker !== undefined}
        isSaving={isSaving}
        onBack={() => {
          flow.dispatch({ type: "go_to_step", step: "unmatched" });
        }}
        onSave={() => {
          if (request) {
            save(request);
          }
        }}
      />
    </>
  );
}

/**
 * The last step of applying: Attach when nothing converts; otherwise Save
 * as, with where the conversions go, what happens to each column, and the
 * button that saves it all in one call.
 */
export function SaveAsStep(props: Readonly<Props>): ReactNode {
  const isConverting = Object.values(props.flow.state.picks).some(
    isConvertingPick,
  );
  return isConverting ? (
    <ConvertingSave {...props} />
  ) : (
    <AttachStep {...props} />
  );
}
