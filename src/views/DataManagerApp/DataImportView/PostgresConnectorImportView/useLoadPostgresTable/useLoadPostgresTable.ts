import { useMutation } from "@avandar/query-hooks";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useState } from "react";
import { DatabaseConnectionClient } from "@/clients/connections/DatabaseConnectionClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { postgresConnectorImportErrorCopy } from "@/views/DataManagerApp/copy/postgresConnectorImportErrorCopy";
import { listPostgresRelations } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/listPostgresRelations";
import { previewPostgresRelation } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/previewPostgresRelation";
import { testAndSavePostgresConnection } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/testAndSavePostgresConnection";
import type { DatabaseConnection } from "$/models/connections/DatabaseConnection/DatabaseConnection";
import type { PostgresDatabaseConnection } from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnection";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset";
import type { PostgresDatabaseConnectionWithDetails } from "@/clients/connections/DatabaseConnectionClient";
import type { PostgresTableDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type {
  ConnectorErrorCode,
  ConnectorRelation,
} from "@sbfn/connectors/Connector";

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
  code: ConnectorErrorCode | undefined;
  title: string;
  message: string;
};

/** `useLoadPostgresTable`'s return value: connection/relation/preview state. */
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
  relations: ConnectorRelation[] | undefined;
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
function _getMostRecentConnection(
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
  const { i18n } = useLingui();
  const workspace = useCurrentWorkspace();

  const [savedConnections, isLoadingSavedConnections] =
    DatabaseConnectionClient.useGetAllPostgres({ workspaceId: workspace.id });

  const [selectedConnectionId, setSelectedConnectionId] = useState<
    DatabaseConnection.Id | "new" | undefined
  >();
  const [connectionError, setConnectionError] = useState<
    PostgresConnectionError | undefined
  >();
  const [relations, setRelations] = useState<ConnectorRelation[] | undefined>();
  const [selectedRelationId, setSelectedRelationId] = useState<
    string | undefined
  >();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    PostgresTableDataSourceMetadata | undefined
  >();

  const [listRelations, isLoadingRelations] = useMutation({
    mutationFn: (params: { connectionId: DatabaseConnection.Id }) => {
      return listPostgresRelations(params.connectionId);
    },
    onSuccess: (newRelations) => {
      setConnectionError(undefined);
      setRelations(newRelations);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Failed to list Postgres relations" });
      const code =
        error instanceof Error && "code" in error
          ? (error as { code: ConnectorErrorCode }).code
          : undefined;
      const copy = postgresConnectorImportErrorCopy({ code, i18n });
      setConnectionError({ code, ...copy });
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
      const mostRecent = _getMostRecentConnection(savedConnections);
      if (mostRecent) {
        setSelectedConnectionId(mostRecent.connection.id);
        listRelations({ connectionId: mostRecent.connection.id });
      }
    },
    [savedConnections, selectedConnectionId, listRelations],
  );

  const [submitConnectionForm, isTestingConnection] = useMutation({
    mutationFn: (values: PostgresConnectionFormValues) => {
      return testAndSavePostgresConnection({
        workspaceId: workspace.id,
        values,
        i18n,
      });
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
          ? (error as { code: ConnectorErrorCode }).code
          : undefined;
      const copy = postgresConnectorImportErrorCopy({ code, i18n });
      setConnectionError({ code, ...copy });
    },
  });

  const [previewRelation, isLoadingPreview] = useMutation({
    mutationFn: previewPostgresRelation,
    onSuccess: (metadata) => {
      setConnectionError(undefined);
      setDataSourceMetadata(metadata);
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Failed to preview Postgres relation" });
      const code =
        error instanceof Error && "code" in error
          ? (error as { code: ConnectorErrorCode }).code
          : undefined;
      const copy = postgresConnectorImportErrorCopy({ code, i18n });
      setConnectionError({ code, ...copy });
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
