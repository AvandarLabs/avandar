import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconDatabase, IconTrash } from "@tabler/icons-react";
import { CaseTypeDraftAttributeRow } from "./CaseTypeDraftAttributeRow/CaseTypeDraftAttributeRow";
import css from "./CaseTypeDraftCard.module.css";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  CaseTypeDraftEditor,
  CaseTypeDraftSourceGroup,
} from "./useCaseTypeDraftEditor";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";

type CatalogColumn = {
  id: string;
  name: string;
};

/**
 * Join-key choices for one dataset: its catalog columns, plus any drafted
 * column the catalog does not list, so a key the model named still shows.
 */
function _joinKeyOptions(
  columns: readonly CatalogColumn[],
  attributes: CaseTypeDraftSourceGroup["attributes"],
  columnNamesById: Readonly<Record<string, string>>,
): Array<{ value: string; label: string }> {
  const catalogColumnIds = new Set(
    columns.map((column) => {
      return column.id;
    }),
  );
  const uncatalogued = attributes.flatMap((attribute) => {
    if (catalogColumnIds.has(attribute.columnId)) {
      return [];
    }
    return [
      {
        value: attribute.columnId,
        label: columnNamesById[attribute.columnId] ?? attribute.name,
      },
    ];
  });
  return [
    ...columns.map((column) => {
      return { value: column.id, label: column.name };
    }),
    ...uncatalogued,
  ];
}

type Props = {
  group: CaseTypeDraftSourceGroup;
  datasetName: string;
  /** Datasets this section may switch to, including the one it already uses. */
  datasetOptions: ReadonlyArray<{ value: string; label: string }>;
  /** Catalog columns, including ones the draft did not map. */
  columns: readonly CatalogColumn[];
  columnNamesById: Readonly<Record<string, string>>;
  labelColumnId: string | undefined;
  /** Catalog column types, keyed by column id, for each row's value rules. */
  columnDataTypesById: Readonly<Record<string, AvaDataType.T>>;
  /** This dataset's date and timestamp columns, for per-period fields. */
  dateColumnOptions: readonly DateColumnOption[];
  editor: CaseTypeDraftEditor;
};

/**
 * One dataset contributing to the case type: which dataset it is, the column
 * its rows are matched on, and the attributes read from it. The dataset and
 * its columns can be swapped, removed, or extended, including when the draft
 * arrived with only one dataset.
 */
export function CaseTypeDraftSourceSection({
  group,
  datasetName,
  datasetOptions,
  columns,
  columnNamesById,
  labelColumnId,
  columnDataTypesById,
  dateColumnOptions,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const joinKeyOptions = _joinKeyOptions(
    columns,
    group.attributes,
    columnNamesById,
  );
  const unusedColumns = columns.filter((column) => {
    return !group.attributes.some((attribute) => {
      return attribute.columnId === column.id;
    });
  });

  return (
    <Stack gap={6} className={css.sourceSection}>
      <Group gap="xs" wrap="nowrap">
        <IconDatabase size={14} color="var(--mantine-color-blue-6)" />
        <Select
          className={css.datasetSelect}
          size="xs"
          aria-label={t`Dataset ${datasetName}`}
          data={datasetOptions}
          value={group.datasetId}
          allowDeselect={false}
          searchable
          onChange={(value) => {
            if (value && value !== group.datasetId) {
              editor.replaceSourceDataset(group.datasetId, value);
            }
          }}
        />
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
      </Group>

      <Select
        size="xs"
        label={t`Join key`}
        description={t`The column matching this dataset's rows to a case`}
        data={joinKeyOptions}
        value={group.primaryKeyColumnId || null}
        placeholder={t`Choose a column`}
        allowDeselect={false}
        searchable
        onChange={(value) => {
          const column = columns.find((candidate) => {
            return candidate.id === value;
          });
          if (column) {
            editor.setPrimaryKeyColumnId(
              group.datasetId,
              column.id,
              column.name,
            );
          }
        }}
      />

      {group.attributes.length === 0 ? (
        <Text size="xs" c="dimmed">
          <Trans>No columns from this dataset.</Trans>
        </Text>
      ) : (
        group.attributes.map((attribute) => {
          return (
            <CaseTypeDraftAttributeRow
              key={attribute.columnId}
              attribute={attribute}
              columnLabel={
                columnNamesById[attribute.columnId] ?? attribute.columnId
              }
              isPrimaryKey={attribute.columnId === group.primaryKeyColumnId}
              isLabelColumn={attribute.columnId === labelColumnId}
              columnDataType={columnDataTypesById[attribute.columnId]}
              dateColumnOptions={dateColumnOptions}
              editor={editor}
            />
          );
        })
      )}

      {unusedColumns.length > 0 ? (
        <Select
          size="xs"
          aria-label={t`Add a field from ${datasetName}`}
          placeholder={t`Add a field`}
          data={unusedColumns.map((column) => {
            return { value: column.id, label: column.name };
          })}
          value={null}
          searchable
          onChange={(columnId) => {
            const column = unusedColumns.find((candidate) => {
              return candidate.id === columnId;
            });
            if (column) {
              editor.addSourceColumn({
                datasetId: group.datasetId,
                columnId: column.id,
                name: column.name,
              });
            }
          }}
        />
      ) : null}
    </Stack>
  );
}
