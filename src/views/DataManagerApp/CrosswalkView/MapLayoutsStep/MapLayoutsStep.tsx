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
import { LayoutStub } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub";
import { MapLayoutsFooter } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsFooter";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MapLayoutsStep.module.css";
import { MappingPane } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane";
import { MappingTable } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable";
import {
  chooseSelectedColumnId,
  chooseShownLayout,
  hasSuggestions,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/mapStepSelection/mapStepSelection";
import { useLayoutValues } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import { useMapStepActions } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useMapStepActions/useMapStepActions";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkStepProps } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepBody";
import type { LayoutValues } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

type LayoutProps = {
  flow: CrosswalkFlow;
  context: CrosswalkContext;
  layout: CrosswalkDraft.Layout;
};

type ValuesStatus = LayoutValues["status"];

/** The layout's first dataset's columns, the sources a fill can read. */
function _getSourceColumns(
  layout: CrosswalkDraft.Layout,
  context: CrosswalkContext,
): CrosswalkLayout.Dataset["columns"] {
  const firstDatasetId = layout.datasetIds[0];
  const columns = firstDatasetId
    ? context.datasetsById.get(firstDatasetId)?.columns
    : undefined;
  return (
    columns ??
    layout.columnNames.map((name) => {
      return { name, dataType: "varchar" as const };
    })
  );
}

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

function LayoutFooter({ flow, layout }: Readonly<LayoutProps>): ReactNode {
  const actions = useMapStepActions(flow);
  return (
    <MapLayoutsFooter
      layout={layout}
      hasSuggestions={hasSuggestions(flow.state.draft, layout.id)}
      isSaving={flow.isSaving}
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

/** The side pane for the selected column, or nothing when there is none. */
function LayoutPane(
  props: Readonly<
    LayoutProps & {
      values: LayoutValues;
      selectedColumnId: CrosswalkColumn.Id | undefined;
    }
  >,
): ReactNode {
  const { flow, context, layout, values } = props;
  const column = flow.state.draft.columns.find((candidate) => {
    return candidate.id === props.selectedColumnId;
  });
  if (!column) {
    return null;
  }
  return (
    <MappingPane
      draft={flow.state.draft}
      layout={layout}
      column={column}
      sourceColumns={_getSourceColumns(layout, context)}
      profilesBySourceColumn={values.profilesBySourceColumn}
      dateFormatsBySourceColumn={values.dateFormatsBySourceColumn}
      context={context}
      dispatch={flow.dispatch}
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
        rail={
          selectedColumnId === undefined ? undefined : <LayoutPane {...props} />
        }
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
}: Readonly<LayoutProps>): ReactNode {
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
  return (
    <>
      <LayoutRegions
        flow={flow}
        context={context}
        layout={layout}
        values={values}
        selectedColumnId={chooseSelectedColumnId(
          draft,
          layout.id,
          chosenColumnId,
        )}
        onSelectColumn={setChosenColumnId}
      />
      <LayoutFooter flow={flow} context={context} layout={layout} />
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
 * starts over on every layout. Pane edits only dispatch; they are saved
 * by the next footer action or layout change.
 */
export function MapLayoutsStep({
  flow,
  catalog,
}: Readonly<CrosswalkStepProps>): ReactNode {
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
    />
  );
}
