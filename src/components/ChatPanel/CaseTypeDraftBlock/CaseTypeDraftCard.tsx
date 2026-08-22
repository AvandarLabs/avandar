import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

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
import { CaseTypeDraftIdentityFields } from "./CaseTypeDraftIdentityFields";
import { CaseTypeDraftManualEntrySection } from "./CaseTypeDraftManualEntrySection";
import { CaseTypeDraftSourceSection } from "./CaseTypeDraftSourceSection";
import { useValuePickerOptions } from "./useValuePickerOptions";

type Props = {
  editor: CaseTypeDraftEditor;
  /** Catalog dataset names, keyed by dataset id. */
  datasetNamesById: Readonly<Record<string, string>>;
  /** Catalog column names, keyed by column id, for the rows and pickers. */
  columnNamesById: Readonly<Record<string, string>>;
  isCreating: boolean;
  onCreate: () => void;
  onDismiss: () => void;
};

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
  datasetNamesById,
  columnNamesById,
  isCreating,
  onCreate,
  onDismiss,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions();
  const { draft, sourceGroups } = editor;
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
    sourceGroups.length === 1
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
              return (
                <CaseTypeDraftSourceSection
                  key={group.datasetId}
                  group={group}
                  datasetName={
                    datasetNamesById[group.datasetId] ?? group.datasetId
                  }
                  columnNamesById={columnNamesById}
                  labelColumnId={draft.labelColumnId}
                  valuePickerOptions={valuePickerOptions}
                  canRemove={sourceGroups.length > 1}
                  editor={editor}
                />
              );
            })}
            <CaseTypeDraftManualEntrySection editor={editor} />
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
          <Button
            size="xs"
            loading={isCreating}
            disabled={!editor.canCreate}
            onClick={onCreate}
          >
            <Trans>Create case type</Trans>
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
