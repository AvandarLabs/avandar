import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconDatabase, IconTrash } from "@tabler/icons-react";
import { CaseTypeDraftAttributeRow } from "./CaseTypeDraftAttributeRow";
import css from "./CaseTypeDraftCard.module.css";
import type {
  CaseTypeDraftEditor,
  CaseTypeDraftSourceGroup,
} from "./useCaseTypeDraftEditor";

type Props = {
  group: CaseTypeDraftSourceGroup;
  datasetName: string;
  columnNamesById: Readonly<Record<string, string>>;
  labelColumnId: string | undefined;
  valuePickerOptions: ReadonlyArray<{ value: string; label: string }>;
  /** Removal is hidden for the last source, which the case type cannot lose. */
  canRemove: boolean;
  editor: CaseTypeDraftEditor;
};

/**
 * One dataset contributing to the case type: the column its rows are matched
 * on, and the attributes read from it. Rendering per source is what makes a
 * case type assembled from several datasets legible.
 */
export function CaseTypeDraftSourceSection({
  group,
  datasetName,
  columnNamesById,
  labelColumnId,
  valuePickerOptions,
  canRemove,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const joinKeyOptions = group.attributes.map((attribute) => {
    return {
      value: attribute.columnId,
      label: columnNamesById[attribute.columnId] ?? attribute.name,
    };
  });

  return (
    <Stack gap={6} className={css.sourceSection}>
      <Group gap="xs" wrap="nowrap">
        <IconDatabase size={14} color="var(--mantine-color-blue-6)" />
        <Text size="xs" fw={600} flex={1} className={css.columnHint}>
          {datasetName}
        </Text>
        {canRemove ?
          <Tooltip label={t`Remove this dataset`}>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              aria-label={t`Remove ${datasetName}`}
              onClick={() => {
                editor.removeSourceDataset(group.datasetId);
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        : null}
      </Group>

      <Select
        size="xs"
        label={t`Join key`}
        description={t`The column matching this dataset's rows to a case`}
        data={joinKeyOptions}
        value={group.primaryKeyColumnId}
        allowDeselect={false}
        searchable
        onChange={(value) => {
          if (value) {
            editor.setPrimaryKeyColumnId(group.datasetId, value);
          }
        }}
      />

      {group.attributes.length === 0 ?
        <Text size="xs" c="dimmed">
          <Trans>No columns from this dataset.</Trans>
        </Text>
      : group.attributes.map((attribute) => {
          return (
            <CaseTypeDraftAttributeRow
              key={attribute.columnId}
              attribute={attribute}
              columnLabel={
                columnNamesById[attribute.columnId] ?? attribute.columnId
              }
              isPrimaryKey={attribute.columnId === group.primaryKeyColumnId}
              isLabelColumn={attribute.columnId === labelColumnId}
              valuePickerOptions={valuePickerOptions}
              editor={editor}
            />
          );
        })
      }
    </Stack>
  );
}
