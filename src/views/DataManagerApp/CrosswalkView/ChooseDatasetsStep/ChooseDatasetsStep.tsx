import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import { IconPlus, IconTableShortcut } from "@tabler/icons-react";
import { useState } from "react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { AddDatasetsModal } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/AddDatasetsModal/AddDatasetsModal";
import { ChooseDatasetsFooter } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ChooseDatasetsFooter";
import { LayoutsTable } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/LayoutsTable";
import { ReferenceLayoutSelect } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/ReferenceLayoutSelect";
import { useSeedColumns } from "@/views/DataManagerApp/CrosswalkView/ChooseDatasetsStep/useSeedColumns/useSeedColumns";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkStepProps } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepBody";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

/** **Add datasets**, light, since Next is the step's primary action. */
function AddDatasetsButton(
  props: Readonly<{ onClick: () => void }>,
): ReactNode {
  return (
    <Button
      variant="light"
      size="compact-sm"
      leftSection={<IconPlus size={14} aria-hidden />}
      onClick={props.onClick}
    >
      <Trans>Add datasets</Trans>
    </Button>
  );
}

/** What step 1 shows before any dataset is added. */
function NoDatasetsYet(props: Readonly<{ onAdd: () => void }>): ReactNode {
  return (
    <AppSlateEmptyState
      icon={<IconTableShortcut size={32} aria-hidden />}
      title={<Trans>Add the datasets to combine.</Trans>}
      message={
        <Trans>Datasets with the same columns are mapped once, together.</Trans>
      }
      action={<AddDatasetsButton onClick={props.onAdd} />}
    />
  );
}

/** The Layouts section: the reference Select, then the layouts table. */
function LayoutsSection(
  props: Readonly<{
    draft: CrosswalkDraft.T;
    context: CrosswalkContext;
    dispatch: CrosswalkFlow["dispatch"];
    onAdd: () => void;
  }>,
): ReactNode {
  const { t, i18n } = useLingui();
  const { draft, context, dispatch } = props;
  return (
    <AppViewSection
      title={t`Layouts`}
      meta={i18n.number(draft.layouts.length)}
      actions={<AddDatasetsButton onClick={props.onAdd} />}
    >
      <Stack gap="lg">
        <ReferenceLayoutSelect
          draft={draft}
          datasetsById={context.datasetsById}
          dispatch={dispatch}
        />
        <LayoutsTable
          draft={draft}
          datasetsById={context.datasetsById}
          onRemoveDataset={(datasetId) => {
            dispatch({ type: "dataset_removed", datasetId });
          }}
        />
      </Stack>
    </AppViewSection>
  );
}

/**
 * Step 1, Choose datasets: add datasets, see them grouped into layouts,
 * remove one, pick the reference layout, and Next. Next seeds the combined
 * dataset's columns from the reference the first time, saves through the
 * flow, and opens Map each dataset once the save went through. Adding,
 * removing, and changing the reference only dispatch: Next saves them.
 */
export function ChooseDatasetsStep({
  flow,
  catalog,
}: Readonly<CrosswalkStepProps>): ReactNode {
  const { draft } = flow.state;
  const { context } = catalog;
  const [isAdding, setIsAdding] = useState(false);
  const seed = useSeedColumns({ flow, catalog });
  const hasDatasets = draft.layouts.some((layout) => {
    return layout.datasetIds.length > 0;
  });
  const openAdd = (): void => {
    setIsAdding(true);
  };
  return (
    <>
      <AppViewBody>
        {hasDatasets ? (
          <LayoutsSection
            draft={draft}
            context={context}
            dispatch={flow.dispatch}
            onAdd={openAdd}
          />
        ) : (
          <NoDatasetsYet onAdd={openAdd} />
        )}
      </AppViewBody>
      <AddDatasetsModal
        isOpen={isAdding}
        draft={draft}
        context={context}
        isCatalogLoading={catalog.isLoading}
        onAdd={(datasetIds) => {
          flow.dispatch({ type: "datasets_added", datasetIds, context });
          setIsAdding(false);
        }}
        onClose={() => {
          setIsAdding(false);
        }}
      />
      <ChooseDatasetsFooter
        canContinue={hasDatasets && seed.isReady}
        isWorking={seed.isWorking || flow.isSaving}
        onNext={() => {
          void seed.continueToMapping();
        }}
      />
    </>
  );
}
