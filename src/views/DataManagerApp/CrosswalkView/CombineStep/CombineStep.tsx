import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { compileCrosswalk } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import { CombinedPreview } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombinedPreview/CombinedPreview";
import { CombineFooter } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombineFooter";
import { CombineProblems } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombineProblems";
import { CombineSettings } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombineSettings";
import { useCombineAccess } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombineAccess/useCombineAccess";
import { useCombinedPreview } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombinedPreview/useCombinedPreview";
import { useSaveCombinedDataset } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useSaveCombinedDataset/useSaveCombinedDataset";
import { isCrosswalkDirty } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CompileCrosswalkResult } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import type { CombineAccess } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombineAccess/useCombineAccess";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkStepProps } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepBody";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

const NO_COLUMN_NAMES: readonly string[] = [];

/** The existing combined dataset's name, else the crosswalk's. */
function useDefaultDatasetName(
  outputDatasetId: Dataset.Id | undefined,
  crosswalkName: string,
): string {
  const [existing] = DatasetClient.useGetById({
    id: outputDatasetId,
    useQueryOptions: { enabled: outputDatasetId !== undefined },
  });
  return existing?.name ?? crosswalkName;
}

/** Why the primary button cannot be used yet, or undefined. */
function useDisabledReason(
  result: CompileCrosswalkResult,
  access: CombineAccess,
  datasetName: string,
): string | undefined {
  const { t } = useLingui();
  if (result.status === "blocked") {
    return t`Fix the problems above to combine.`;
  }
  if (datasetName.trim() === "") {
    return t`Enter a name for the combined dataset.`;
  }
  if (access.status !== "denied") {
    return undefined;
  }
  switch (access.reason) {
    case "not_admin":
      return t`Only workspace admins can add datasets.`;
    case "dataset_limit":
      return t`Your plan's dataset limit is reached, so a new dataset can't be added.`;
    case "not_dataset_editor":
      return t`You need edit access to ${datasetName} to update it.`;
    case "failed":
      return t`Avandar couldn't check your access to ${datasetName}. Reload the page and try again.`;
  }
}

/**
 * Saving from step 3: the crosswalk first through `flow.save` when its
 * draft changed, so the crosswalk row always matches the SQL it produced,
 * then the combined dataset. A crosswalk save that did not go through
 * (offline, refused, or a second press) stops here; the flow has said why.
 */
function useCombineSave(
  flow: CrosswalkFlow,
  options: Readonly<{
    result: CompileCrosswalkResult;
    datasetName: string;
    outputDatasetId: Dataset.Id | undefined;
  }>,
): { save: () => Promise<void>; isSaving: boolean } {
  const [saveCombined, isSavingCombined] = useSaveCombinedDataset();
  const save = async (): Promise<void> => {
    const { result } = options;
    if (result.status !== "ready") {
      return;
    }
    const { draft } = flow.state;
    if (isCrosswalkDirty(flow.state) && !(await flow.save(draft))) {
      return;
    }
    await saveCombined({
      crosswalkId: draft.crosswalkId,
      outputDatasetId: options.outputDatasetId,
      result,
      datasetName: options.datasetName,
    });
  };
  return { save, isSaving: flow.isSaving || isSavingCombined };
}

type BodyProps = {
  flow: CrosswalkFlow;
  context: CrosswalkContext;
  result: CompileCrosswalkResult;
  datasetName: string;
  onDatasetNameChange: (datasetName: string) => void;
};

/** The settings, the problems, and the preview of the stacked rows. */
function CombineBody(props: Readonly<BodyProps>): ReactNode {
  const { flow, context, result } = props;
  const { draft } = flow.state;
  const ready = result.status === "ready" ? result : undefined;
  const columnNames = useMemo(() => {
    return (
      ready?.columns.map((column) => {
        return column.name;
      }) ?? NO_COLUMN_NAMES
    );
  }, [ready]);
  const preview = useCombinedPreview({ sql: ready?.sql, columnNames });
  return (
    <AppViewBody>
      <Stack gap="xl">
        <CombineSettings
          draft={draft}
          datasetName={props.datasetName}
          onDatasetNameChange={props.onDatasetNameChange}
          context={context}
          dispatch={flow.dispatch}
        />
        <CombineProblems
          problems={result.problems}
          draft={draft}
          datasetsById={context.datasetsById}
        />
        {ready ? (
          <CombinedPreview
            preview={preview}
            columnNames={columnNames}
            datasetCount={ready.includedDatasetIds.length}
          />
        ) : null}
      </Stack>
    </AppViewBody>
  );
}

/** What step 3 compiled, who may save it, and what it would be called. */
function useCombineState(props: Readonly<CrosswalkStepProps>): {
  result: CompileCrosswalkResult;
  outputDatasetId: Dataset.Id | undefined;
  datasetName: string;
  setDatasetName: (datasetName: string) => void;
  access: CombineAccess;
  disabledReason: string | undefined;
} {
  const { flow, catalog, crosswalk } = props;
  const { context } = catalog;
  const { draft } = flow.state;
  // The crosswalk row knows a combined dataset created in this session; the
  // draft only knows the one it was loaded with.
  const outputDatasetId = crosswalk?.outputDatasetId ?? draft.outputDatasetId;
  const result = useMemo(() => {
    return compileCrosswalk({
      draft,
      datasetsById: context.datasetsById,
      entriesById: context.entriesById,
    });
  }, [draft, context.datasetsById, context.entriesById]);
  const defaultName = useDefaultDatasetName(outputDatasetId, draft.name);
  const [typedName, setDatasetName] = useState<string | undefined>(undefined);
  const datasetName = typedName ?? defaultName;
  const access = useCombineAccess(outputDatasetId);
  const disabledReason = useDisabledReason(result, access, datasetName);
  return {
    result,
    outputDatasetId,
    datasetName,
    setDatasetName,
    access,
    disabledReason,
  };
}

/**
 * Step 3, Create combined dataset (Update once it exists): the combined
 * dataset's settings, what the compile found, a preview of the stacked
 * rows, and the button that saves it, with the reason when it cannot.
 */
export function CombineStep(props: Readonly<CrosswalkStepProps>): ReactNode {
  const { t } = useLingui();
  const { flow } = props;
  const state = useCombineState(props);
  const { save, isSaving } = useCombineSave(flow, state);
  return (
    <>
      <CombineBody
        flow={flow}
        context={props.catalog.context}
        result={state.result}
        datasetName={state.datasetName}
        onDatasetNameChange={state.setDatasetName}
      />
      <CombineFooter
        label={
          state.outputDatasetId
            ? t`Update combined dataset`
            : t`Create combined dataset`
        }
        disabledReason={state.disabledReason}
        isDisabled={
          state.disabledReason !== undefined ||
          state.access.status === "checking"
        }
        isSaving={isSaving}
        onBack={() => {
          flow.goToStep("map");
        }}
        onSave={() => {
          void save();
        }}
      />
    </>
  );
}
