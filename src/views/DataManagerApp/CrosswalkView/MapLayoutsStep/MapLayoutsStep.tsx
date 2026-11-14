import { Callout } from "@avandar/ui";
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Center, Group, Loader, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";
import { useLayoutNamer } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/useLayoutNamer";
import { AddColumnButton } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/AddColumnButton";
import { LayoutPane } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutPane/LayoutPane";
import { LayoutStub } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub";
import { MapLayoutsFooter } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsFooter";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsStep.module.css";
import { MappingTable } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable";
import {
  chooseSelectedColumnId,
  chooseShownLayout,
  hasSuggestions,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/mapStepSelection/mapStepSelection";
import { SuggestMatchesButton } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/SuggestMatchesButton/SuggestMatchesButton";
import {
  useCrosswalkMeaningMatches,
  useCrosswalkSuggestionConsent,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches";
import { useLayoutValues } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import { useMapStepActions } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useMapStepActions/useMapStepActions";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkStepProps } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepBody";
import type { CrosswalkSuggestionConsent } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches";
import type { LayoutValues } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

type LayoutProps = {
  flow: CrosswalkFlow;
  context: CrosswalkContext;
  layout: CrosswalkDraft.Layout;
};

type ValuesStatus = LayoutValues["status"];

/**
 * The section meta under the layout's name: Reference, or "+n with the
 * same layout" (the same message `LayoutName` shows in the stub).
 */
function useLayoutMeta(
  layout: CrosswalkDraft.Layout,
  context: CrosswalkContext,
): string | undefined {
  const { t } = useLingui();
  if (layout.isReference) {
    return t`Reference`;
  }
  const { otherDatasetCount } = getLayoutLabel(layout, context.datasetsById);
  return otherDatasetCount > 0
    ? plural(otherDatasetCount, {
        one: "+# with the same layout",
        other: "+# with the same layout",
      })
    : undefined;
}

function ValuesNote(
  props: Readonly<{ status: ValuesStatus; datasetName: string }>,
): ReactNode {
  const { t } = useLingui();
  const { datasetName } = props;
  if (props.status === "reading") {
    return (
      <Group gap="xs" role="status">
        <Loader size="xs" />
        <Text size="sm" c="dimmed">
          <Trans>Reading the values of {datasetName} on this device</Trans>
        </Text>
      </Group>
    );
  }
  if (props.status === "failed") {
    return (
      <Callout
        color="warning"
        titleOrder={3}
        titleSize="sm"
        messageSize="sm"
        title={t`The values could not be read`}
        message={t`Matches use column names and types only. You can still map ${datasetName}.`}
      />
    );
  }
  return null;
}

function LayoutTableSection(
  props: Readonly<
    LayoutProps & {
      valuesStatus: ValuesStatus;
      selectedColumnId: CrosswalkColumn.Id | undefined;
      onSelectColumn: (columnId: CrosswalkColumn.Id) => void;
    }
  >,
): ReactNode {
  const { layout, context, flow } = props;
  const name = useLayoutNamer(context.datasetsById)(layout);
  const meta = useLayoutMeta(layout, context);
  return (
    <AppViewSection title={name} meta={meta}>
      <Stack gap="sm" align="flex-start">
        <ValuesNote status={props.valuesStatus} datasetName={name} />
        <MappingTable
          draft={flow.state.draft}
          layoutId={layout.id}
          entriesById={context.entriesById}
          selectedColumnId={props.selectedColumnId}
          onSelectColumn={props.onSelectColumn}
        />
        <AddColumnButton draft={flow.state.draft} dispatch={flow.dispatch} />
      </Stack>
    </AppViewSection>
  );
}

function LayoutFooter(
  props: Readonly<
    LayoutProps & {
      values: LayoutValues;
      suggestionConsent: CrosswalkSuggestionConsent;
    }
  >,
): ReactNode {
  const { flow, layout } = props;
  const actions = useMapStepActions(flow);
  const meaningMatches = useCrosswalkMeaningMatches({
    draft: flow.state.draft,
    layoutId: layout.id,
    context: props.context,
    targets: props.values.targets,
    profilesBySourceColumn: props.values.profilesBySourceColumn,
    suggestionConsent: props.suggestionConsent,
    dispatch: flow.dispatch,
  });
  return (
    <MapLayoutsFooter
      layout={layout}
      hasSuggestions={hasSuggestions(flow.state.draft, layout.id)}
      isSaving={flow.isSaving}
      suggestMatches={<SuggestMatchesButton meaningMatches={meaningMatches} />}
      onSkip={() => {
        void actions.skip(layout.id);
      }}
      onReopen={() => {
        void actions.reopen(layout.id);
      }}
      onAcceptAll={() => {
        void actions.acceptAll(layout.id);
      }}
      onConfirm={() => {
        void actions.confirmAndNext(layout.id);
      }}
    />
  );
}

/** The side pane for the selected column, or no rail when none is. */
function _buildRail(
  props: Readonly<LayoutProps & { values: LayoutValues }>,
  selectedColumnId: CrosswalkColumn.Id | undefined,
): ReactNode {
  if (selectedColumnId === undefined) {
    return undefined;
  }
  return (
    <LayoutPane
      draft={props.flow.state.draft}
      context={props.context}
      layout={props.layout}
      values={props.values}
      selectedColumnId={selectedColumnId}
      dispatch={props.flow.dispatch}
    />
  );
}

/** The stub, the layout's table, and the side pane, left to right. */
function LayoutRegions(
  props: Readonly<
    LayoutProps & {
      values: LayoutValues;
      selectedColumnId: CrosswalkColumn.Id | undefined;
      onSelectColumn: (columnId: CrosswalkColumn.Id) => void;
    }
  >,
): ReactNode {
  const { flow, context, layout, values, selectedColumnId } = props;
  return (
    <div className={css.mapLayoutsBody}>
      <LayoutStub
        draft={flow.state.draft}
        datasetsById={context.datasetsById}
        selectedLayoutId={layout.id}
        onSelectLayout={(layoutId) => {
          void flow.selectLayout(layoutId);
        }}
      />
      <AppViewBody
        className={css.mapLayoutsMain}
        rail={_buildRail(props, selectedColumnId)}
      >
        <LayoutTableSection
          flow={flow}
          context={context}
          layout={layout}
          valuesStatus={values.status}
          selectedColumnId={selectedColumnId}
          onSelectColumn={props.onSelectColumn}
        />
      </AppViewBody>
    </div>
  );
}

/** The shown layout: its regions and its footer. */
function LayoutMapping({
  flow,
  context,
  layout,
  suggestionConsent,
}: Readonly<
  LayoutProps & { suggestionConsent: CrosswalkSuggestionConsent }
>): ReactNode {
  const { draft, readLayoutIds } = flow.state;
  const values = useLayoutValues({
    draft,
    layoutId: layout.id,
    readLayoutIds,
    context,
    dispatch: flow.dispatch,
  });
  const [chosenColumnId, setChosenColumnId] = useState(() => {
    return chooseSelectedColumnId(draft, layout.id, undefined);
  });
  const selectedColumnId = chooseSelectedColumnId(
    draft,
    layout.id,
    chosenColumnId,
  );
  // A chosen column that is gone falls back once and stays there, so later
  // edits to the fills never move the selection by themselves.
  if (selectedColumnId !== chosenColumnId) {
    setChosenColumnId(selectedColumnId);
  }
  return (
    <>
      <LayoutRegions
        flow={flow}
        context={context}
        layout={layout}
        values={values}
        selectedColumnId={selectedColumnId}
        onSelectColumn={setChosenColumnId}
      />
      <LayoutFooter
        flow={flow}
        context={context}
        layout={layout}
        values={values}
        suggestionConsent={suggestionConsent}
      />
    </>
  );
}

function NoLayouts({ onBack }: Readonly<{ onBack: () => void }>): ReactNode {
  return (
    <Center flex={1} p="xxl">
      <Stack align="center" gap="sm" maw={720}>
        <Text size="sm" c="dimmed">
          <Trans>Add the datasets to combine first.</Trans>
        </Text>
        <Button variant="default" onClick={onBack}>
          <Trans>Choose datasets</Trans>
        </Button>
      </Stack>
    </Center>
  );
}

/**
 * Step 2, Map each dataset: the layout stub, the shown layout's mapping
 * table with Add a column under it, the selected column's side pane, and
 * the footer that skips, accepts suggestions, or confirms and moves on.
 * The shown layout's subtree is keyed by its id, so the selected column
 * starts over on every layout, while the answer to sending column names
 * for Suggest matches is kept above it. Pane edits only dispatch. They are
 * saved by the next footer action or layout change.
 */
export function MapLayoutsStep({
  flow,
  catalog,
}: Readonly<CrosswalkStepProps>): ReactNode {
  // Above the per-layout subtree, so one answer covers every layout.
  const suggestionConsent = useCrosswalkSuggestionConsent();
  const layout = chooseShownLayout(flow.state.draft, flow.layoutId);
  if (!layout) {
    return (
      <NoLayouts
        onBack={() => {
          flow.goToStep("datasets");
        }}
      />
    );
  }
  return (
    <LayoutMapping
      key={layout.id}
      flow={flow}
      context={catalog.context}
      layout={layout}
      suggestionConsent={suggestionConsent}
    />
  );
}
