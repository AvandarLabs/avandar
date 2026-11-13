import { Callout } from "@avandar/ui";
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { useId } from "react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import {
  findAddedCodeConflicts,
  isConvertingPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import { buildUnmatchedRows } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/buildUnmatchedRows";
import { UnmatchedValuesFooter } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/UnmatchedValuesFooter";
import { UnmatchedValuesTable } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/UnmatchedValuesTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AddedCodeConflict } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { UnmatchedRow } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/buildUnmatchedRows";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
  flow: ApplyFlow;
  lookups: ApplyLookups;
  /** The preview drawer, between the body and the footer. */
  preview: ReactNode;
};

type BodyProps = Props & { canEditDictionaries: boolean };

/**
 * One section of values, a region named by its heading, so a screen
 * reader can jump between the two lists.
 */
function ValuesSection(
  props: Readonly<{
    title: ReactNode;
    rows: readonly UnmatchedRow[];
    flow: ApplyFlow;
    canEditDictionaries: boolean;
    addedCodeConflicts: readonly AddedCodeConflict[];
  }>,
): ReactNode {
  const headingId = useId();
  if (props.rows.length === 0) {
    return null;
  }
  const countText = plural(props.rows.length, {
    one: "# value",
    other: "# values",
  });
  return (
    <div role="region" aria-labelledby={headingId}>
      <AppViewSection
        title={<span id={headingId}>{props.title}</span>}
        meta={countText}
      >
        <UnmatchedValuesTable
          rows={props.rows}
          resolutions={props.flow.state.resolutions}
          canEditDictionaries={props.canEditDictionaries}
          addedCodeConflicts={props.addedCodeConflicts}
          dispatch={props.flow.dispatch}
        />
      </AppViewSection>
    </div>
  );
}

/**
 * The step's rows, and every Add to list resolution whose code another adds
 * to the same list with another label.
 */
function _buildRowsAndConflicts(props: Readonly<BodyProps>): {
  rows: ReturnType<typeof buildUnmatchedRows>;
  addedCodeConflicts: AddedCodeConflict[];
} {
  const { unmatched } = props.flow;
  const { picks, resolutions } = props.flow.state;
  const unmatchedByColumnId =
    unmatched.status === "ready" ? unmatched.result : new Map();
  return {
    rows: buildUnmatchedRows({
      columns: props.columns,
      picks,
      resolutions,
      codeLists: props.lookups.codeLists,
      unmatchedByColumnId,
    }),
    addedCodeConflicts: findAddedCodeConflicts({
      picks,
      resolutions,
      unmatchedByColumnId,
    }),
  };
}

function ReadyBody(props: Readonly<BodyProps>): ReactNode {
  const { t } = useLingui();
  const { rows, addedCodeConflicts } = _buildRowsAndConflicts(props);
  if (rows.converted.length === 0 && rows.reference.length === 0) {
    return (
      <AppSlateEmptyState
        icon={<IconCircleCheck size={32} stroke={1.5} aria-hidden />}
        title={t`Nothing is unmatched`}
        message={
          <Trans>
            Every value in the columns you picked is in its code list.
          </Trans>
        }
      />
    );
  }
  const shared = {
    flow: props.flow,
    canEditDictionaries: props.canEditDictionaries,
    addedCodeConflicts,
  };
  return (
    <Stack gap="xl">
      <ValuesSection
        {...shared}
        title={<Trans>Values being converted</Trans>}
        rows={rows.converted}
      />
      <ValuesSection
        {...shared}
        title={<Trans>Values without a label</Trans>}
        rows={rows.reference}
      />
    </Stack>
  );
}

function UnmatchedBody(props: Readonly<BodyProps>): ReactNode {
  const { t } = useLingui();
  const { status } = props.flow.unmatched;
  if (status === "reading") {
    return (
      <Center p="xxl">
        <Stack align="center" gap="sm">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            <Trans>Finding values that are not in the code lists</Trans>
          </Text>
        </Stack>
      </Center>
    );
  }
  if (status === "failed") {
    return (
      <Callout
        maw={560}
        title={t`The values could not be read`}
        message={t`Avandar could not read which values are missing from the code lists. You can go on: every value no pair matches is kept as it is.`}
      />
    );
  }
  return <ReadyBody {...props} />;
}

/**
 * The Unmatched values step: every value of a picked column that its code
 * list does not hold, with its rows and how to resolve it. Converted
 * columns can keep, map, add, or empty a value; reference columns can leave
 * it unlabeled or add it to the list.
 */
export function UnmatchedValuesStep(props: Readonly<Props>): ReactNode {
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const isConverting = Object.values(props.flow.state.picks).some(
    isConvertingPick,
  );
  return (
    <>
      <AppViewBody>
        <UnmatchedBody {...props} canEditDictionaries={canEditDictionaries} />
      </AppViewBody>
      {props.preview}
      <UnmatchedValuesFooter
        isConverting={isConverting}
        isLinkedDataset={props.flow.targets?.isLinkedDataset ?? false}
        dispatch={props.flow.dispatch}
      />
    </>
  );
}
