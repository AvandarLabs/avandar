import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Button,
  Group,
  Loader,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useState } from "react";
import { ConnectorRow } from "@/views/DataManagerApp/DataImportView/ConnectorRow/ConnectorRow";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import {
  formatSavedConnectionLabel,
  useLoadPostgresTable,
} from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/useLoadPostgresTable";
import type { PostgresTableDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { PostgresConnectionFormValues } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/useLoadPostgresTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection";

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
 * spreadsheet's (a few tabs, flat, in one document). See design spec
 * section 7.4.
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
    <Trans>
      {load.savedConnections?.length} saved{" "}
      {load.savedConnections?.length === 1 ? "database" : "databases"}{" "}
      available
    </Trans>
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
  // hundreds of tables across many schemas (spec section 7 item 2), so
  // this cannot be the same small, ungrouped `Select` the Sheets tab
  // picker uses.
  const relationsBySchema = new Map<
    string,
    Array<{ value: string; label: string }>
  >();
  for (const relation of load.relations ?? []) {
    const schemaName = relation.relationId.split(".")[0] ?? "";
    const items = relationsBySchema.get(schemaName) ?? [];
    items.push({ value: relation.relationId, label: relation.label });
    relationsBySchema.set(schemaName, items);
  }
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
            <Stack gap="sm" maw="420px">
              <TextInput
                label={t`Label`}
                placeholder={t`Prod reporting replica`}
                value={formValues.name}
                onChange={(event) => {
                  setFormValues({
                    ...formValues,
                    name: event.currentTarget.value,
                  });
                }}
              />
              <TextInput
                label={t`Host`}
                value={formValues.host}
                onChange={(event) => {
                  setFormValues({
                    ...formValues,
                    host: event.currentTarget.value,
                  });
                }}
              />
              <Group grow>
                <NumberInput
                  label={t`Port`}
                  value={formValues.port}
                  onChange={(value) => {
                    setFormValues({
                      ...formValues,
                      port: typeof value === "number" ? value : 5432,
                    });
                  }}
                />
                <Select
                  label={t`SSL mode`}
                  data={[
                    { value: "require", label: t`Require` },
                    { value: "disable", label: t`Disable` },
                  ]}
                  value={formValues.sslMode}
                  onChange={(value) => {
                    if (value === "require" || value === "disable") {
                      setFormValues({ ...formValues, sslMode: value });
                    }
                  }}
                />
              </Group>
              <TextInput
                label={t`Database`}
                value={formValues.databaseName}
                onChange={(event) => {
                  setFormValues({
                    ...formValues,
                    databaseName: event.currentTarget.value,
                  });
                }}
              />
              <TextInput
                label={t`Username`}
                value={formValues.username}
                onChange={(event) => {
                  setFormValues({
                    ...formValues,
                    username: event.currentTarget.value,
                  });
                }}
              />
              <PasswordInput
                label={t`Password`}
                value={formValues.password}
                onChange={(event) => {
                  setFormValues({
                    ...formValues,
                    password: event.currentTarget.value,
                  });
                }}
              />
              <Text size="xs" c="dimmed">
                <Trans>
                  The database user should ideally have read-only access to
                  the table or view you plan to import.
                </Trans>
              </Text>
              {load.connectionError ? (
                <Text size="sm" c="error" role="alert">
                  {load.connectionError.message}
                </Text>
              ) : null}
              <Group>
                <Button
                  loading={load.isTestingConnection}
                  onClick={() => {
                    load.onSubmitConnectionForm(formValues);
                  }}
                >
                  <Trans>Connect</Trans>
                </Button>
              </Group>
            </Stack>
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

          <Text size="xs" c="dimmed" maw="65ch">
            <Trans>
              New connectors are added every month. If there is a database or
              service you need, tell us so we can prioritize it.
            </Trans>
          </Text>
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
              load.setDataSourceMetadata(
                metadata as PostgresTableDataSourceMetadata,
              );
            }}
            isProcessing={load.isLoadingPostgresTable}
            onRequestDataReparse={load.onRequestDataReparse}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
