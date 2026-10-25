import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import { camelCaseKeysDeep, nullsToUndefinedDeep, pipe } from "@avandar/utils";
import { z } from "zod";
import type {
  DatabaseConnectionId,
  DatabaseConnectionModel,
} from "$/models/DatabaseConnection/DatabaseConnection.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  connection_type: z.literal("postgres"),
  created_at: z.iso.datetime({ offset: true }),
  created_by: z.uuid().nullable(),
  id: z.uuid(),
  name: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Read-only in practice - see `DatabaseConnectionClient`. Writes to
 * `db_connections` happen exclusively through the `connectors` edge
 * function (only it can create the matching Vault secret); the browser
 * client never inserts or updates this table directly.
 */
export const DatabaseConnectionParsers =
  makeParserRegistry<DatabaseConnectionModel>().build({
    modelName: "DatabaseConnection",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return Model.make("DatabaseConnection", {
          ...obj,
          id: obj.id as DatabaseConnectionId,
          createdBy: obj.createdBy as UserId | undefined,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: () => {
      throw new Error(
        "DatabaseConnection is never inserted from client code - only the connectors edge function may create one.",
      );
    },
    fromModelUpdateToDBUpdate: () => {
      throw new Error(
        "DatabaseConnection is never updated from client code - only the connectors edge function may update one.",
      );
    },
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = DatabaseConnectionModel;
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
