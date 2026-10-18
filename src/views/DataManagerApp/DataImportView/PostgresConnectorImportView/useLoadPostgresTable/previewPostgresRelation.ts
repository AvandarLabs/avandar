import { MIMEType } from "@avandar/utils";
import { PostgresRelationId } from "$/connectors/postgres/PostgresRelationId/PostgresRelationId";
import { uuid } from "$/lib/uuid";
import { APIClient } from "@/clients/APIClient";
import { postgresDataTypeToDuckDbType } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/postgresDataTypeToDuckDbType";
import type { DatabaseConnection } from "$/models/connections/DatabaseConnection/DatabaseConnection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset";
import type { PostgresTableDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

/**
 * Fetches one relation's preview rows and builds the `postgres_table`
 * data-source metadata `DatasetImportForm` renders, from the `connectors`
 * proxy's `preview` route.
 */
export async function previewPostgresRelation(
  params: Readonly<{
    connectionId: DatabaseConnection.Id;
    relationId: string;
    relationKind: PostgresTableDataset.RelationKind;
  }>,
): Promise<PostgresTableDataSourceMetadata> {
  const result = await APIClient.get({
    route:
      "connectors/:connectorType/connections/:connectionId/relations/:relationId/preview",
    pathParams: {
      connectorType: "postgres",
      connectionId: params.connectionId,
      // Not encoded here: the API client already encodes every path param.
      relationId: params.relationId,
    },
  });
  if ("error" in result) {
    throw Object.assign(new Error(result.error.message), {
      code: result.error.code,
    });
  }
  const split = PostgresRelationId.splitRelationId(params.relationId);
  if (!split) {
    throw new Error(`Unexpected relation id '${params.relationId}'`);
  }
  const { schemaName, tableName } = split;
  const newDatasetId = uuid() as Dataset.Id;
  return {
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
      // Not a real sniff: Postgres's column types come from
      // `information_schema` (`result.columns` below), not from DuckDB
      // auto-detection.
      csvSniff: {
        Delimiter: ",",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: result.columns.map((column) => {
          return {
            name: column.columnName,
            type: postgresDataTypeToDuckDbType(column.sourceType),
          };
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
          // The declared Postgres type, which is what the saved dataset
          // casts this column to at query time (`savePostgresTableDataset`).
          column_type: postgresDataTypeToDuckDbType(column.sourceType),
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
  };
}
