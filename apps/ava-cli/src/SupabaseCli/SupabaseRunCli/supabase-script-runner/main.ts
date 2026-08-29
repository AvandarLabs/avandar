import { Acclimate } from "@avandar/acclimate";
import knex from "knex";
import { QueryResult } from "pg";
import { UnknownRecord } from "type-fest";

function _getEnvSupabasePostgresURL(): string {
  if (!process.env.SUPABASE_POSTGRES_URL) {
    throw new Error(
      "SUPABASE_POSTGRES_URL is not set in the environment variables",
    );
  }
  return process.env.SUPABASE_POSTGRES_URL ?? "";
}

function _getSupabaseDBConnection({ isLocal = false }: { isLocal: boolean }) {
  return knex({
    client: "pg",
    wrapIdentifier: (value: string) => {
      return `"${value.replace(/"/g, '""')}"`;
    },
    connection: {
      connectionString: _getEnvSupabasePostgresURL(),
      ssl: isLocal ? false : { rejectUnauthorized: false },
    },
    pool: { min: 0, max: 10 },
  });
}

async function _runPGQuery(
  db: knex.Knex,
  query: string,
): Promise<UnknownRecord[]> {
  const results = await db.raw<QueryResult<UnknownRecord>>(query);
  return results.rows;
}

Acclimate.run(
  Acclimate.createCLI("supabase-script-runner")
    .description("Run a Supabase script")
    .addOption({
      name: "--dbLocationType",
      description:
        "The Supabase location type. One of: local, staging, production",
      type: "string",
      required: true,
    })
    .addOption({
      name: "--sql",
      description: "The SQL query to run",
      type: "string",
      required: true,
    })
    .addOption({
      name: "--absolutePathToScript",
      description: "The row schema to use",
      type: "string",
      required: true,
    })
    .action(async ({ dbLocationType, sql, absolutePathToScript }) => {
      Acclimate.log(
        "Connecting to |yellow|$dbLocationType$|reset| Supabase database...",
        { dbLocationType },
      );

      const { RowSchema, execute } = await import(absolutePathToScript);

      // validate that the script module exports the appropriate members
      if (typeof execute !== "function") {
        Acclimate.log(
          "|red|ERROR: The script did not export an execute function.",
        );
        return;
      }

      if (typeof RowSchema !== "object") {
        Acclimate.log(
          "|red|ERROR: The script did not export a RowSchema object.",
        );
        return;
      }

      // connect to supabase database
      const db = _getSupabaseDBConnection({
        isLocal: dbLocationType === "local",
      });

      // run the user's query
      Acclimate.log("Running raw query...");
      Acclimate.log("\t|white|$sql$", { sql });

      const rows = await _runPGQuery(db, sql);
      Acclimate.log("Number of rows returned: $rowCount$", {
        rowCount: rows.length,
      });

      const parsedRows = RowSchema.array().parse(rows);
      await execute({ rows: parsedRows });
    }),
);
