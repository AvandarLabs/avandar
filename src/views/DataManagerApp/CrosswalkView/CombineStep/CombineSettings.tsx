import { Trans, useLingui } from "@lingui/react/macro";
import {
  Checkbox,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useId, useState } from "react";
import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { Dispatch, ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  datasetName: string;
  onDatasetNameChange: (datasetName: string) => void;
  context: CrosswalkContext;
  dispatch: Dispatch<CrosswalkAction>;
};

function SourceColumnCheckbox({
  draft,
  context,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [isRefused, setIsRefused] = useState(false);
  const sourceColumnName = Crosswalk.SOURCE_COLUMN_NAME;
  const hasColumnNamedLikeIt = draft.columns.some((column) => {
    return column.name.trim().toLowerCase() === sourceColumnName;
  });
  return (
    <Checkbox
      label={t`Add a ${sourceColumnName} column`}
      description={t`Names the dataset each row came from.`}
      checked={draft.addsSourceColumn}
      error={
        isRefused && !draft.addsSourceColumn
          ? t`A column is already named ${sourceColumnName}. Rename it in Map each dataset first.`
          : undefined
      }
      onChange={(event) => {
        const addsSourceColumn = event.currentTarget.checked;
        if (addsSourceColumn && hasColumnNamedLikeIt) {
          setIsRefused(true);
          return;
        }
        setIsRefused(false);
        dispatch({
          type: "settings_changed",
          changes: { addsSourceColumn },
          context,
        });
      }}
    />
  );
}

function CodesOutputControl({
  draft,
  context,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  if (
    !draft.columns.some((column) => {
      return column.entryId !== undefined;
    })
  ) {
    return null;
  }
  return (
    <Stack gap={6} align="flex-start">
      <Text id={labelId} size="sm" fw={500}>
        <Trans>Coded columns come out as</Trans>
      </Text>
      <SegmentedControl
        size="xs"
        aria-labelledby={labelId}
        value={draft.codesOutputAs}
        data={[
          { value: "labels", label: t`Labels` },
          { value: "codes", label: t`Codes` },
        ]}
        onChange={(value) => {
          const codesOutputAs = value === "codes" ? "codes" : "labels";
          dispatch({
            type: "settings_changed",
            changes: { codesOutputAs },
            context,
          });
        }}
      />
    </Stack>
  );
}

/**
 * The combined dataset's own settings: its name, whether it gets a
 * source_dataset column, and, when a column is governed, whether coded
 * columns come out as labels or codes. The two settings change the draft.
 * The name is saved with the dataset.
 */
export function CombineSettings(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <AppViewSection title={<Trans>Combined dataset</Trans>}>
      <Stack gap="md" maw="40rem">
        <TextInput
          label={t`Name`}
          value={props.datasetName}
          error={props.datasetName.trim() === "" ? t`Enter a name.` : undefined}
          onChange={(event) => {
            props.onDatasetNameChange(event.currentTarget.value);
          }}
        />
        <SourceColumnCheckbox {...props} />
        <CodesOutputControl {...props} />
      </Stack>
    </AppViewSection>
  );
}
