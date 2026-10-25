import { useMutation } from "@avandar/query-hooks";
import { MIMEType, propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useState } from "react";
import { uuid } from "$/lib/uuid";
import { APIClient } from "@/clients/APIClient";
import { DatabaseConnectionClient } from "@/clients/connections/DatabaseConnectionClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { Logger } from "@/utils/Logger";
import { postgresConnectorImportErrorCopy } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/postgresConnectorImportErrorCopy";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection";
import type { PostgresDatabaseConnection } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset";
import type { PostgresDatabaseConnectionWithDetails } from "@/clients/connections/DatabaseConnectionClient";
import type { PostgresTableDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type {
  ExternalDatasetErrorCode,
  ExternalDatasetRelation,
} from "@sbfn/connectors/connectors/ExternalDatasetConnector";

/**
 * The connection form's own fields - never retained once test-and-save
 * succeeds.
 */
export type PostgresConnectionFormValues = {
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  sslMode: PostgresDatabaseConnection.SslMode;
};

/**
 * The error shape surfaced inline under the connection form. Retains
 * nothing - the form keeps its own field state.
 */
export type PostgresConnectionError = {
  code: ExternalDatasetErrorCode | undefined;
  title: string;
  message: string;
};

export type PostgresTableLoad = {
  /** Every saved Postgres connection in this workspace, for the picker. */
  savedConnections: PostgresDatabaseConnectionWithDetails[] | undefined;
  isLoadingSavedConnections: boolean;

  /**
   * The connection currently in play - an existing saved connection, or
   * `undefined` while no connection is selected/open yet. `"new"` means the
   * inline connection form is open (either because there are no saved
   * connections yet, or the user picked "+ New database").
   */
  selectedConnectionId: DatabaseConnection.Id | "new" | undefined;
  onSelectConnection: (id: DatabaseConnection.Id | "new") => void;

  /**
   * Submits the connection form. Also the "test" - a successful response
   * is the proof.
   */
  onSubmitConnectionForm: (values: PostgresConnectionFormValues) => void;
  isTestingConnection: boolean;
  connectionError: PostgresConnectionError | undefined;

  /** The relation (table/view) list for the active connection, once known. */
  relations: ExternalDatasetRelation[] | undefined;
  isLoadingRelations: boolean;

  selectedRelationId: string | undefined;
  onSelectRelation: (relationId: string) => void;
  isLoadingPreview: boolean;

  previewRows: Array<Record<string, unknown>> | undefined;
  dataSourceMetadata: PostgresTableDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    metadata: PostgresTableDataSourceMetadata | undefined,
  ) => void;

  isLoadingPostgresTable: boolean;
  onRequestDataReparse: (parseOptions: FileParseOptions) => Promise<void>;
};

const POSTGRES_RELATION_KINDS = [
  "table",
  "view",
] as const satisfies readonly PostgresTableDataset.RelationKind[];

/**
 * Whether the `connectors` proxy reported a relation kind this
 * connector actually understands - its `kind` field is a plain `string`
 * shared across every connector type, so a connector-specific caller must
 * validate it before narrowing.
 */
function _isPostgresRelationKind(
  kind: string,
): kind is PostgresTableDataset.RelationKind {
  return (POSTGRES_RELATION_KINDS as readonly string[]).includes(kind);
}

/**
 * The saved connection most recently verified, or most recently created if
 * none has been.
 */
function _mostRecentConnection(
  connections: readonly PostgresDatabaseConnectionWithDetails[],
): PostgresDatabaseConnectionWithDetails | undefined {
  return [...connections].sort((a, b) => {
    const aTime = a.postgres.lastVerifiedAt ?? a.connection.createdAt;
    const bTime = b.postgres.lastVerifiedAt ?? b.connection.createdAt;
    return bTime.localeCompare(aTime);
  })[0];
}

/**
 * Owns the Postgres connector's connection picker/form state, the picked
 * relation, and the fetched preview. Mirrors `useLoadGoogleSheet`'s shape
 * (`DataImportView/CLAUDE.md`), with one structural difference: a saved
 * connection is reusable across many imports, so this hook also owns
 * picking *which* connection, not just which relation.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database;
 * that's `useSaveDataset`.
 */
export function useLoadPostgresTable(): PostgresTableLoad {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();

  const [savedConnections, isLoadingSavedConnections] =
    DatabaseConnectionClient.useGetAllPostgres({ workspaceId: workspace.id });

  const [selectedConnectionId, setSelectedConnectionId] = useState<
    DatabaseConnection.Id | "new" | undefined
  >();
  const [connectionError, setConnectionError] = useState<
    PostgresConnectionError | undefined
  >();
  const [relations, setRelations] = useState<
    ExternalDatasetRelation[] | undefined
  >();
  const [selectedRelationId, setSelectedRelationId] = useState<
    string | undefined
  >();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    PostgresTableDataSourceMetadata | undefined
  >();

  const [listRelations, isLoadingRelations] = useMutation({
    mutationFn: async (params: {
      connectionId: DatabaseConnection.Id;
    }): Promise<ExternalDatasetRelation[]> => {
      const result = await APIClient.get({
        route: "connectors/:connectorType/connections/:connectionId/relations",
        pathParams: {
          connectorType: "postgres",
          connectionId: params.connectionId,
        },
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return result.relations;
    },
    onSuccess: (newRelations) => {
      setRelations(newRelations);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Failed to list Postgres relations" });
      const copy = postgresConnectorImportErrorCopy({
        code: undefined,
        i18n,
      });
      setConnectionError({ code: undefined, ...copy });
    },
  });

  // Defaults the picker to the most-recently-verified saved connection, and
  // eagerly lists its tables, so a returning user sees the table picker
  // without an extra click.
  useEffect(
    function selectMostRecentConnectionOnLoad() {
      if (selectedConnectionId !== undefined || !savedConnections) {
        return;
      }
      if (savedConnections.length === 0) {
        setSelectedConnectionId("new");
        return;
      }
      const mostRecent = _mostRecentConnection(savedConnections);
      if (mostRecent) {
        setSelectedConnectionId(mostRecent.connection.id);
        listRelations({ connectionId: mostRecent.connection.id });
      }
    },
    [savedConnections, selectedConnectionId, listRelations],
  );

  const [submitConnectionForm, isTestingConnection] = useMutation({
    mutationFn: async (
      values: PostgresConnectionFormValues,
    ): Promise<{
      connectionId: string;
      relations: ExternalDatasetRelation[];
    }> => {
      const jobId = JobProgressStore.startJob(t`Connecting to database`);
      try {
        JobProgressStore.updateJob(jobId, {
          status: "indeterminate",
          label: t`Connecting to database`,
          detail: t`Listing tables...`,
        });
        const result = await APIClient.post({
          route: "connectors/:connectorType/connections/test-and-save",
          pathParams: { connectorType: "postgres" },
          body: {
            workspaceId: workspace.id,
            name: values.name,
            host: values.host,
            port: values.port,
            databaseName: values.databaseName,
            username: values.username,
            password: values.password,
            sslMode: values.sslMode,
          },
        });
        if ("error" in result) {
          JobProgressStore.failJob(jobId, result.error.message);
          throw Object.assign(new Error(result.error.message), {
            code: result.error.code,
          });
        }
        JobProgressStore.finishJob(jobId);
        return result;
      } catch (error) {
        if (!(error instanceof Error && "code" in error)) {
          JobProgressStore.failJob(
            jobId,
            error instanceof Error ? error.message : String(error),
          );
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      setConnectionError(undefined);
      setSelectedConnectionId(result.connectionId as DatabaseConnection.Id);
      setRelations(result.relations);
    },
    onError: (error: unknown) => {
      Logger.error(error, { devMsg: "Postgres test-and-save failed" });
      const code =
        error instanceof Error && "code" in error
          ? (error as { code: ExternalDatasetErrorCode }).code
          : undefined;
      const copy = postgresConnectorImportErrorCopy({ code, i18n });
      setConnectionError({ code, ...copy });
    },
  });

  const [previewRelation, isLoadingPreview] = useMutation({
    mutationFn: async (params: {
      connectionId: DatabaseConnection.Id;
      relationId: string;
      relationKind: PostgresTableDataset.RelationKind;
    }): Promise<void> => {
      const result = await APIClient.get({
        route:
          "connectors/:connectorType/connections/:connectionId/relations/:relationId/preview",
        pathParams: {
          connectorType: "postgres",
          connectionId: params.connectionId,
          relationId: encodeURIComponent(params.relationId),
        },
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      const [schemaName, tableName] = params.relationId.split(/\.(.*)/s);
      if (!schemaName || tableName === undefined) {
        throw new Error(`Unexpected relation id '${params.relationId}'`);
      }
      const newDatasetId = uuid() as Dataset.Id;
      setDataSourceMetadata({
        sourceType: "postgres_table",
        connectionId: params.connectionId,
        datasetLoadResult: {
          datasetId: newDatasetId,
          numRows: result.previewRows.length,
          type: "csv",
          id: uuid(),
          csvName: `${schemaName}.${tableName}.csv`,
          // The real Postgres table/view name - there is no local DuckDB
          // view to name at import time (unlike Sheets, nothing here calls
          // `DuckDbClient.loadCsv`; that only happens later, at acquire
          // time, in `acquirePostgresTableRelation`).
          tableName,
          numRejectedRows: 0,
          errors: { rejectedScans: [], rejectedRows: [] },
          // Cosmetic for this preview only - not a real sniff, since
          // Postgres's column types already come from `information_schema`
          // (`result.columns` below), not from DuckDB auto-detection. The
          // real transcode at acquire time runs its own real sniff.
          csvSniff: {
            Delimiter: ",",
            Quote: '"',
            Escape: '"',
            NewLineDelimiter: "\n",
            Comment: "",
            SkipRows: 0,
            HasHeader: true,
            Columns: result.columns.map((column) => {
              return { name: column.columnName, type: "VARCHAR" };
            }),
            DateFormat: null,
            TimestampFormat: null,
            UserArguments: "",
            Prompt: "",
            table_name: newDatasetId,
          },
          schemaName,
          relationKind: params.relationKind,
          previewRows: result.previewRows,
          columns: result.columns.map((column) => {
            return {
              column_name: column.columnName,
              // Postgres's `information_schema.data_type` string (e.g.
              // "integer"), not a real DuckDB type - good enough for this
              // preview table's column headers; the acquire-time transcode
              // infers real DuckDB types independently.
              column_type: "VARCHAR",
              default: undefined,
              extra: null,
              key: null,
              null: "YES",
            };
          }),
          // No parquet yet at import time - the acquire-time transcode
          // produces the real bytes later, same reasoning as the DuckDB
          // view name above.
          parquetData: new Blob([], { type: MIMEType.APPLICATION_PARQUET }),
        },
        parseOptions: { type: "postgres_table" },
      });
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Failed to preview Postgres relation" });
      const copy = postgresConnectorImportErrorCopy({
        code: undefined,
        i18n,
      });
      setConnectionError({ code: undefined, ...copy });
    },
  });

  const onSelectConnection = useCallback(
    (id: DatabaseConnection.Id | "new") => {
      setSelectedConnectionId(id);
      setConnectionError(undefined);
      setRelations(undefined);
      setSelectedRelationId(undefined);
      setDataSourceMetadata(undefined);
      if (id !== "new") {
        listRelations({ connectionId: id });
      }
    },
    [listRelations],
  );

  const onSubmitConnectionForm = useCallback(
    (values: PostgresConnectionFormValues) => {
      submitConnectionForm(values);
    },
    [submitConnectionForm],
  );

  const onSelectRelation = useCallback(
    (relationId: string) => {
      setSelectedRelationId(relationId);
      const relation = relations?.find(propEq("relationId", relationId));
      if (
        !relation ||
        selectedConnectionId === undefined ||
        selectedConnectionId === "new" ||
        !_isPostgresRelationKind(relation.kind)
      ) {
        return;
      }
      previewRelation({
        connectionId: selectedConnectionId,
        relationId,
        relationKind: relation.kind,
      });
    },
    [previewRelation, relations, selectedConnectionId],
  );

  const onRequestDataReparse = useCallback(
    async (parseOptions: FileParseOptions) => {
      if (
        parseOptions.type !== "postgres_table" ||
        selectedRelationId === undefined ||
        selectedConnectionId === undefined ||
        selectedConnectionId === "new"
      ) {
        return;
      }
      const relation = relations?.find(
        propEq("relationId", selectedRelationId),
      );
      if (!relation || !_isPostgresRelationKind(relation.kind)) {
        return;
      }
      previewRelation({
        connectionId: selectedConnectionId,
        relationId: selectedRelationId,
        relationKind: relation.kind,
      });
    },
    [previewRelation, relations, selectedConnectionId, selectedRelationId],
  );

  return {
    savedConnections,
    isLoadingSavedConnections,
    selectedConnectionId,
    onSelectConnection,
    onSubmitConnectionForm,
    isTestingConnection,
    connectionError,
    relations,
    isLoadingRelations,
    selectedRelationId,
    onSelectRelation,
    isLoadingPreview,
    previewRows: dataSourceMetadata?.datasetLoadResult.previewRows,
    dataSourceMetadata,
    setDataSourceMetadata,
    isLoadingPostgresTable: isLoadingPreview,
    onRequestDataReparse,
  };
}
