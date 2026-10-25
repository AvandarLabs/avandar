import { makeBucketMap } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Box, BoxProps, Button, Loader, Select, Stack } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useState } from "react";
import { ConnectorRow } from "@/views/DataManagerApp/DataImportView/ConnectorRow/ConnectorRow";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { formatSavedConnectionLabel } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/formatSavedConnectionLabel";
import { PostgresConnectionForm } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectionForm";
import { useLoadPostgresTable } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PostgresConnectionFormValues } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable";

type Props = BoxProps & {
  /**
   * When set, this callback is invoked with the newly saved dataset instead
   * of the default navigation to the dataset detail page.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

const NEW_DATABASE_VALUE = "new" as const;

const EMPTY_FORM_VALUES: PostgresConnectionFormValues = {
  name: "",
  host: "",
  port: 5432,
  databaseName: "",
  username: "",
  password: "",
  sslMode: "require",
};

/**
 * Postgres connection picker/form plus the dataset import form after a
 * table or view is sniffed.
 *
 * Reuses `ConnectorRow` verbatim and the "sniffed import view" shape
 * verbatim (`DataImportView/CLAUDE.md`) - the only genuinely new
 * composition is the schema-grouped relation picker, because a database's
 * shape (many relations, organized by schema, in one server) differs from a
 * spreadsheet's (a few tabs, flat, in one document).
 */
export function PostgresConnectorImportView({
  onSaveSuccess,
  ...props
}: Props): JSX.Element {
  const { t } = useLingui();
  const load = useLoadPostgresTable();
  const [formValues, setFormValues] =
    useState<PostgresConnectionFormValues>(EMPTY_FORM_VALUES);

  const hasSavedConnections = (load.savedConnections?.length ?? 0) > 0;
  const showForm = load.selectedConnectionId === NEW_DATABASE_VALUE;

  const connectorStatus = load.isLoadingSavedConnections ? (
    <Loader size="xs" />
  ) : hasSavedConnections ? (
    <Plural
      value={load.savedConnections?.length ?? 0}
      one="# saved database available"
      other="# saved databases available"
    />
  ) : (
    <Trans>Import a table or view from a database your organization runs</Trans>
  );

  const connectionPicker = hasSavedConnections ? (
    <Select
      aria-label={t`Database`}
      data={[
        ...(load.savedConnections ?? []).map((details) => {
          return {
            value: details.connection.id,
            label: formatSavedConnectionLabel(details),
          };
        }),
        { value: NEW_DATABASE_VALUE, label: t`+ New database` },
      ]}
      value={load.selectedConnectionId ?? null}
      onChange={(value) => {
        if (value !== null) {
          setFormValues(EMPTY_FORM_VALUES);
          load.onSelectConnection(
            value === NEW_DATABASE_VALUE
              ? NEW_DATABASE_VALUE
              : (value as DatabaseConnection.Id),
          );
        }
      }}
    />
  ) : null;

  const connectorAction = load.isLoadingSavedConnections ? (
    <Loader size="xs" />
  ) : hasSavedConnections ? (
    connectionPicker
  ) : (
    <Button
      variant="default"
      size="compact-sm"
      onClick={() => {
        load.onSelectConnection(NEW_DATABASE_VALUE);
      }}
    >
      <Trans>Use a database</Trans>
    </Button>
  );

  // Mantine's grouped `Select` data shape is `{group, items}[]`, not a flat
  // list with an inline `group` key per item - real databases run to
  // hundreds of tables across many schemas, so this cannot be the same
  // small, ungrouped `Select` the Sheets tab picker uses.
  const relationsBySchema = makeBucketMap(load.relations ?? [], {
    keyFn: (relation) => {
      return relation.relationId.split(".")[0] ?? "";
    },
    valueFn: (relation) => {
      return { value: relation.relationId, label: relation.label };
    },
  });
  const relationOptions = [...relationsBySchema.entries()].map(
    ([group, items]) => {
      return { group, items };
    },
  );

  return (
    <Box {...props}>
      <Stack gap="xl">
        <Stack gap="sm">
          <ConnectorRow
            icon={<IconDatabase size={20} stroke={1.6} aria-hidden />}
            name={<Trans>Postgres</Trans>}
            status={connectorStatus}
            action={connectorAction}
          />

          {showForm ? (
            <PostgresConnectionForm
              formValues={formValues}
              onFormValuesChange={setFormValues}
              connectionError={load.connectionError}
              isTestingConnection={load.isTestingConnection}
              onSubmit={() => {
                load.onSubmitConnectionForm(formValues);
              }}
            />
          ) : null}

          {!showForm && load.isLoadingRelations ? <Loader size="xs" /> : null}

          {!showForm && load.relations ? (
            <Select
              label={t`Table or view to import`}
              searchable
              data={relationOptions}
              value={load.selectedRelationId ?? null}
              onChange={(value) => {
                if (value !== null) {
                  load.onSelectRelation(value);
                }
              }}
            />
          ) : null}

          {!showForm && load.isLoadingPreview ? <Loader size="xs" /> : null}
        </Stack>

        {load.previewRows && load.dataSourceMetadata ? (
          <DatasetImportForm
            key={load.dataSourceMetadata.datasetLoadResult.datasetId}
            initialDatasetName={
              load.dataSourceMetadata.datasetLoadResult.tableName
            }
            rows={load.previewRows}
            dataSourceMetadata={load.dataSourceMetadata}
            parseOptions={load.dataSourceMetadata.parseOptions}
            onSaveSuccess={onSaveSuccess}
            onDataSourceMetadataChange={(metadata) => {
              if (metadata.sourceType !== "postgres_table") {
                return;
              }
              load.setDataSourceMetadata(metadata);
            }}
            isProcessing={load.isLoadingPostgresTable}
            onRequestDataReparse={load.onRequestDataReparse}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
