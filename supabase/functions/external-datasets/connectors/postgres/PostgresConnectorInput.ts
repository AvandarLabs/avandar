import { number, object, string } from "zod";
import type { z } from "zod";

/**
 * `test-and-save`'s body shape for the `postgres` connector type (spec
 * section 5.4's route table: `{ name, host, port, databaseName, username,
 * password, sslMode }`, plus the shared `workspaceId`/optional
 * `connectionId` every connector type's body carries).
 */
export const postgresTestAndSaveInputSchema = object({
  workspaceId: string(),
  connectionId: string().optional(),
  name: string().min(1),
  host: string().min(1),
  port: number().int().positive(),
  databaseName: string().min(1),
  username: string().min(1),
  password: string().min(1),
  sslMode: string().refine(
    (value): value is "disable" | "require" => {
      return value === "disable" || value === "require";
    },
    { message: "sslMode must be 'disable' or 'require'" },
  ),
});

export type PostgresTestAndSaveInput = z.infer<
  typeof postgresTestAndSaveInputSchema
>;
