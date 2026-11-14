import { Trans } from "@lingui/react/macro";
import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import { useId, useMemo } from "react";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildCodeListLookups } from "@/lib/crosswalks/buildCodeListLookups/buildCodeListLookups";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { ColumnSettings } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/ColumnSettings";
import { CombineInput } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/CombineInput";
import { ConstantInput } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/ConstantInput";
import { ConvertControl } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/ConvertControl";
import { FillExample } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/FillExample";
import { FillKindControl } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/FillKindControl";
import { makeFillForKind } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/makeFillForKind/makeFillForKind";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane.module.css";
import { SourceColumnSelect } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/SourceColumnSelect";
import { SuggestionActions } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/SuggestionActions";
import { TranslateCodesControl } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/TranslateCodesControl";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { Dispatch, ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  layout: CrosswalkDraft.Layout;
  column: CrosswalkDraft.Column;
  /** The layout's first dataset's columns, in column order. */
  sourceColumns: ReadonlyArray<{ name: string; dataType: AvaDataType.T }>;
  profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  dateFormatsBySourceColumn: ReadonlyMap<string, string>;
  context: CrosswalkContext;
  dispatch: Dispatch<CrosswalkAction>;
};

type FillProps = Props & {
  lookups: CrosswalkSql.CodeLists;
  setFill: (fill: CrosswalkMapping.Fill) => void;
};

function _sameName(nameA: string, nameB: string): boolean {
  return nameA.trim().toLowerCase() === nameB.trim().toLowerCase();
}

function PaneHeading(
  props: Readonly<{ id: string; column: CrosswalkDraft.Column }>,
): ReactNode {
  const { column } = props;
  return (
    <Stack gap={2}>
      <Title order={3} size="h5" id={props.id}>
        {column.name}
      </Title>
      <Group gap="xs">
        <Text size="xs" c="dimmed">
          {avaDataTypeLabel(column.dataType)}
        </Text>
        {column.entryId ? (
          <Badge size="xs" variant="light" color="neutral">
            <Trans>Code list</Trans>
          </Badge>
        ) : null}
      </Group>
    </Stack>
  );
}

/** Translating codes for a governed column, changing values for any other. */
function ColumnTreatment(
  props: Readonly<
    FillProps & { fill: Extract<CrosswalkMapping.Fill, { kind: "column" }> }
  >,
): ReactNode {
  const { fill, column, setFill } = props;
  if (column.entryId) {
    return (
      <TranslateCodesControl
        entry={props.context.entriesById.get(column.entryId)}
        codeListId={fill.codeListId}
        holdsLabels={fill.holdsLabels}
        onChange={(change) => {
          setFill({ ...fill, ...change, convert: undefined });
        }}
      />
    );
  }
  const sourceDataType = props.sourceColumns.find((source) => {
    return _sameName(source.name, fill.sourceColumn);
  })?.dataType;
  return (
    <ConvertControl
      convert={fill.convert}
      sourceDataType={sourceDataType}
      detectedDateFormat={props.dateFormatsBySourceColumn.get(
        fill.sourceColumn,
      )}
      onChange={(convert) => {
        setFill({
          ...fill,
          convert,
          codeListId: undefined,
          holdsLabels: false,
        });
      }}
    />
  );
}

function ColumnFillControls(
  props: Readonly<
    FillProps & { fill: Extract<CrosswalkMapping.Fill, { kind: "column" }> }
  >,
): ReactNode {
  const { fill, setFill } = props;
  return (
    <>
      <SourceColumnSelect
        sourceColumn={fill.sourceColumn}
        sourceColumns={props.sourceColumns}
        profilesBySourceColumn={props.profilesBySourceColumn}
        onChange={(sourceColumn) => {
          setFill({ ...fill, sourceColumn });
        }}
      />
      <ColumnTreatment {...props} />
    </>
  );
}

/** The controls for the fill's kind. */
function FillDetails(
  props: Readonly<FillProps & { fill: CrosswalkMapping.Fill }>,
): ReactNode {
  const { fill, setFill } = props;
  const columnName = props.column.name;
  switch (fill.kind) {
    case "column":
      return <ColumnFillControls {...props} fill={fill} />;
    case "constant":
      return (
        <ConstantInput
          value={fill.value}
          onChange={(value) => {
            setFill({ kind: "constant", value });
          }}
        />
      );
    case "expression":
      return (
        <CombineInput
          key={`${props.layout.id}:${props.column.id}`}
          sql={fill.sql}
          columnNames={props.layout.columnNames}
          onChange={(sql) => {
            setFill({ kind: "expression", sql });
          }}
        />
      );
    case "empty":
      return (
        <Text size="sm" c="dimmed">
          <Trans>Rows from these datasets leave {columnName} empty.</Trans>
        </Text>
      );
  }
}

/** The example for a fill, read from the layout's first dataset. */
function FillExampleSlot(
  props: Readonly<FillProps & { fill: CrosswalkMapping.Fill }>,
): ReactNode {
  const workspace = useCurrentWorkspace();
  const { layout } = props;
  const datasetId = layout.datasetIds[0];
  if (!datasetId) {
    return null;
  }
  return (
    <FillExample
      workspaceId={workspace.id}
      datasetId={datasetId}
      datasetName={props.context.datasetsById.get(datasetId)?.name ?? ""}
      fill={props.fill}
      column={props.column}
      codesOutputAs={props.draft.codesOutputAs}
      columnNames={layout.columnNames}
      {...props.lookups}
    />
  );
}

/** Accept or Reject while the column's fill is a suggestion. */
function SuggestionSlot(
  props: Readonly<FillProps & { status: CrosswalkMapping.Status | undefined }>,
): ReactNode {
  const { layout, column, dispatch } = props;
  if (props.status !== "suggested") {
    return null;
  }
  return (
    <SuggestionActions
      columnName={column.name}
      onAccept={() => {
        dispatch({
          type: "suggestion_accepted",
          layoutId: layout.id,
          columnId: column.id,
        });
      }}
      onReject={() => {
        dispatch({
          type: "suggestion_rejected",
          layoutId: layout.id,
          columnId: column.id,
        });
      }}
    />
  );
}

function FillKindSlot(
  props: Readonly<FillProps & { fill: CrosswalkMapping.Fill | undefined }>,
): ReactNode {
  const { layout, column } = props;
  const primaryCodeListId = column.entryId
    ? (props.lookups.primaryCodeListIdByEntryId.get(column.entryId) as
        | DataDictionaryCodeList.Id
        | undefined)
    : undefined;
  return (
    <FillKindControl
      kind={props.fill?.kind}
      onChange={(kind) => {
        props.setFill(
          makeFillForKind({
            kind,
            current: props.fill,
            targetName: column.name,
            columnNames: layout.columnNames,
            primaryCodeListId,
          }),
        );
      }}
    />
  );
}

function FillSection(props: Readonly<FillProps>): ReactNode {
  const mapping = CrosswalkDraft.getFill(
    props.draft,
    props.layout.id,
    props.column.id,
  );
  const fill = mapping?.fill;
  return (
    <Stack gap="md" className={css.fillSection}>
      <FillKindSlot {...props} fill={fill} />
      {fill ? (
        <>
          <FillDetails {...props} fill={fill} />
          <FillExampleSlot {...props} fill={fill} />
        </>
      ) : (
        <Text size="sm" c="dimmed">
          <Trans>Not filled yet</Trans>
        </Text>
      )}
      <SuggestionSlot {...props} status={mapping?.status} />
    </Stack>
  );
}

/**
 * Step 2's side pane: the selected column of the combined dataset, its own
 * settings, and how the selected layout fills it, with an example of what
 * that gives and Accept or Reject while the fill is a suggestion. Every
 * change is stored as a confirmed fill.
 */
export function MappingPane(props: Readonly<Props>): ReactNode {
  const headingId = useId();
  const { layout, column, dispatch, context } = props;
  const lookups = useMemo(() => {
    return buildCodeListLookups(context.entriesById);
  }, [context.entriesById]);
  const setFill = (fill: CrosswalkMapping.Fill): void => {
    dispatch({
      type: "fill_set",
      layoutId: layout.id,
      columnId: column.id,
      fill,
    });
  };
  return (
    <section aria-labelledby={headingId}>
      <Stack gap="md">
        <PaneHeading id={headingId} column={column} />
        <ColumnSettings
          key={column.id}
          draft={props.draft}
          column={column}
          context={context}
          dispatch={dispatch}
        />
        <FillSection {...props} lookups={lookups} setFill={setFill} />
      </Stack>
    </section>
  );
}
