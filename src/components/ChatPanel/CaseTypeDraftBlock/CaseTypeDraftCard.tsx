import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import css from "./CaseTypeDraftCard.module.css";
import { CaseTypeDraftDatasetPicker } from "./CaseTypeDraftDatasetPicker";
import { CaseTypeDraftIdentityFields } from "./CaseTypeDraftIdentityFields";
import { CaseTypeDraftManualEntrySection } from "./CaseTypeDraftManualEntrySection";
import { CaseTypeDraftSourceSection } from "./CaseTypeDraftSourceSection";
import { CaseTypeDraftStatusSection } from "./CaseTypeDraftStatusSection";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";

type Props = {
  editor: CaseTypeDraftEditor;
  /** Workspace datasets the draft can switch to or join. */
  datasets: ReadonlyArray<{ id: string; name: string }>;
  /** Catalog columns keyed by dataset id, for join keys and added fields. */
  columnsByDatasetId: Readonly<
    Record<string, ReadonlyArray<{ id: string; name: string }>>
  >;
  /** Catalog dataset names, keyed by dataset id. */
  datasetNamesById: Readonly<Record<string, string>>;
  /** Catalog column names, keyed by column id, for the rows and pickers. */
  columnNamesById: Readonly<Record<string, string>>;
  /** Catalog column types, keyed by column id, for each row's value rules. */
  columnDataTypesById: Readonly<Record<string, AvaDataType.T>>;
  /**
   * Each source dataset's date and timestamp columns, for a per-period
   * field's date column picker.
   */
  dateColumnOptionsByDatasetId: Readonly<
    Record<string, readonly DateColumnOption[]>
  >;
  isCreating: boolean;
  /** Omitted when the user cannot create case types. */
  onCreate?: () => void;
  onDismiss: () => void;
};

/**
 * Datasets this section may switch to: the one it uses, plus any the draft
 * does not already pull from. The current one stays listed even before the
 * catalog has loaded its name.
 */
function _datasetOptions(options: {
  datasets: ReadonlyArray<{ id: string; name: string }>;
  datasetId: string;
  datasetName: string;
  usedDatasetIds: ReadonlySet<string>;
}): Array<{ value: string; label: string }> {
  const available = options.datasets
    .filter((dataset) => {
      return (
        dataset.id === options.datasetId ||
        !options.usedDatasetIds.has(dataset.id)
      );
    })
    .map((dataset) => {
      return { value: dataset.id, label: dataset.name };
    });
  if (
    available.some((dataset) => {
      return dataset.value === options.datasetId;
    })
  ) {
    return available;
  }
  return [
    { value: options.datasetId, label: options.datasetName },
    ...available,
  ];
}

/**
 * The editable case type draft the Case Manager model proposed. Every field
 * arrives prefilled, so confirming without edits is a valid path.
 *
 * Attributes are grouped by the dataset each reads, because a case type is
 * normally assembled from columns spread across several datasets rather than
 * being a view of one.
 */
export function CaseTypeDraftCard({
  editor,
  datasets,
  columnsByDatasetId,
  datasetNamesById,
  columnNamesById,
  columnDataTypesById,
  dateColumnOptionsByDatasetId,
  isCreating,
  onCreate,
  onDismiss,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const { draft, sourceGroups } = editor;
  const usedDatasetIds = new Set(
    sourceGroups.map((group) => {
      return group.datasetId;
    }),
  );
  const labelOptions = draft.attributes
    .filter((attribute) => {
      return attribute.isIncluded;
    })
    .map((attribute) => {
      return {
        value: attribute.columnId,
        label: columnNamesById[attribute.columnId] ?? attribute.name,
      };
    });
  const sourceCountLabel =
    sourceGroups.length === 0
      ? t`No datasets`
      : sourceGroups.length === 1
        ? t`1 dataset`
        : t`${sourceGroups.length} datasets joined`;

  return (
    <Paper withBorder shadow="xs" radius="md" p="md" bg="blue.0">
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <IconSparkles size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={600}>
            <Trans>Draft case type</Trans>
          </Text>
          <Text size="xs" c="dimmed">
            {sourceCountLabel}
          </Text>
        </Group>

        <div className={css.draftCardBody} data-testid="case-type-draft-body">
          <Stack gap="sm">
            <CaseTypeDraftIdentityFields
              editor={editor}
              labelOptions={labelOptions}
            />
            <Divider
              label={t`Where the fields come from`}
              labelPosition="left"
              variant="dashed"
            />
            {sourceGroups.map((group) => {
              const datasetName =
                datasetNamesById[group.datasetId] ?? group.datasetId;
              const datasetOptions = _datasetOptions({
                datasets,
                datasetId: group.datasetId,
                datasetName,
                usedDatasetIds,
              });
              return (
                <CaseTypeDraftSourceSection
                  key={group.datasetId}
                  group={group}
                  datasetName={datasetName}
                  datasetOptions={datasetOptions}
                  columns={columnsByDatasetId[group.datasetId] ?? []}
                  columnNamesById={columnNamesById}
                  labelColumnId={draft.labelColumnId}
                  columnDataTypesById={columnDataTypesById}
                  dateColumnOptions={
                    dateColumnOptionsByDatasetId[group.datasetId] ?? []
                  }
                  editor={editor}
                />
              );
            })}
            <CaseTypeDraftDatasetPicker
              datasets={datasets}
              usedDatasetIds={usedDatasetIds}
              isEmpty={sourceGroups.length === 0}
              onPick={editor.addSourceDataset}
            />
            <CaseTypeDraftManualEntrySection editor={editor} />
            <CaseTypeDraftStatusSection editor={editor} />
            <Checkbox
              size="xs"
              label={t`Let people create cases by hand too`}
              checked={draft.allowManualCreation}
              onChange={(event) => {
                editor.setAllowManualCreation(event.currentTarget.checked);
              }}
            />
          </Stack>
        </div>

        <Group justify="flex-end" gap="xs" className={css.draftCardActions}>
          <Button
            variant="subtle"
            color="neutral"
            size="xs"
            disabled={isCreating}
            onClick={onDismiss}
          >
            <Trans>Discard</Trans>
          </Button>
          {onCreate ? (
            <Button
              size="xs"
              loading={isCreating}
              disabled={!editor.canCreate}
              onClick={onCreate}
            >
              <Trans>Create case type</Trans>
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );
}
