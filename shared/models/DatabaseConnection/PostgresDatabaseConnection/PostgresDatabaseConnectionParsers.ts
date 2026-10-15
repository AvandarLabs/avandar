import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import { camelCaseKeysDeep, nullsToUndefinedDeep, pipe } from "@avandar/utils";
import { z } from "zod";
import type { DatabaseConnectionId } from "$/models/DatabaseConnection/DatabaseConnection.types.ts";
import type {
  PostgresDatabaseConnectionModel,
  VaultSecretId,
} from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  connection_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  database_name: z.string(),
  host: z.string(),
  last_verified_at: z.iso.datetime({ offset: true }).nullable(),
  port: z.number(),
  ssl_mode: z.enum(["disable", "require"]),
  updated_at: z.iso.datetime({ offset: true }),
  username: z.string(),
  vault_secret_id: z.uuid(),
  workspace_id: z.uuid(),
});

/**
 * Note: this is read-only in practice - see `DatabaseConnectionClient`, which
 * is the only consumer and never calls `fromModelInsertToDBInsert` or
 * `fromModelUpdateToDBUpdate`. Writes happen exclusively through the
 * `external-datasets` edge function, which never goes through this parser
 * registry (it writes with `SupabaseAdmin`, outside the browser bundle).
 */
export const PostgresDatabaseConnectionParsers =
  makeParserRegistry<PostgresDatabaseConnectionModel>().build({
    modelName: "PostgresDatabaseConnection",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return Model.make("PostgresDatabaseConnection", {
          ...obj,
          connectionId: obj.connectionId as DatabaseConnectionId,
          vaultSecretId: obj.vaultSecretId as VaultSecretId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: () => {
      throw new Error(
        "PostgresDatabaseConnection is never inserted from client code - only the external-datasets edge function may create one.",
      );
    },
    fromModelUpdateToDBUpdate: () => {
      throw new Error(
        "PostgresDatabaseConnection is never updated from client code - only the external-datasets edge function may update one.",
      );
    },
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = PostgresDatabaseConnectionModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
