import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A seeded connection, with the ids `PostgresConnectionSeed.remove` needs. */
export type SeededPostgresConnection = Readonly<{
  connectionId: string;
  vaultSecretId: string;
}>;

type WorkspaceAdminOptions = Readonly<{
  admin: AvaSupabaseDBClient;
  workspaceId: string;
}>;

/**
 * Seeds one saved Postgres connection (`connections` +
 * `connections__postgres`) for the workspace, with a real Vault secret. The
 * password is never dialed, since every spec stubs the database round trip,
 * but the foreign keys and the RLS and Vault shape are real.
 */
async function create(
  options: WorkspaceAdminOptions,
): Promise<SeededPostgresConnection> {
  const { admin, workspaceId } = options;

  const { data: secretId, error: secretError } = await admin.rpc(
    "rpc_connections__create_vault_secret",
    {
      p_secret: "e2e-throwaway-password",
      p_name: `e2e-postgres-connector-${Date.now()}`,
      p_description:
        "Created by a Postgres connector e2e spec; safe to delete.",
    },
  );
  if (secretError || !secretId) {
    throw new Error(`vault secret seed failed: ${secretError?.message}`);
  }

  // From here, a failure must roll back whatever already succeeded (the
  // Vault secret at minimum) before rethrowing, so a mid-seed failure never
  // leaves a row behind that the caller has no id to clean up.
  try {
    const { data: connection, error: connectionError } = await admin
      .from("connections")
      .insert({
        workspace_id: workspaceId,
        connection_type: "postgres",
        name: "E2E reporting replica",
      })
      .select("id")
      .single();
    if (connectionError || !connection) {
      throw new Error(`connections seed failed: ${connectionError?.message}`);
    }

    const { error: postgresError } = await admin
      .from("connections__postgres")
      .insert({
        connection_id: connection.id,
        workspace_id: workspaceId,
        host: "db.e2e-fixture.invalid",
        port: 5432,
        database_name: "reporting",
        username: "readonly_user",
        ssl_mode: "require",
        vault_secret_id: secretId,
        last_verified_at: new Date().toISOString(),
      });
    if (postgresError) {
      await admin.from("connections").delete().eq("id", connection.id);
      throw new Error(
        `connections__postgres seed failed: ${postgresError.message}`,
      );
    }

    return { connectionId: connection.id, vaultSecretId: secretId };
  } catch (error) {
    await admin.rpc("rpc_connections__delete_vault_secret", {
      p_secret_id: secretId,
      p_workspace_id: workspaceId,
    });
    throw error;
  }
}

/**
 * Deletes a seeded connection's rows and the Vault secret they point at.
 * Delete the datasets imported through it first: a Postgres dataset's
 * foreign key points at its connection.
 */
async function remove(
  options: WorkspaceAdminOptions & { connection: SeededPostgresConnection },
): Promise<void> {
  const { admin, connection, workspaceId } = options;

  // Children before the parent: `connections__postgres.connection_id` is a
  // foreign key onto `connections.id`.
  await admin
    .from("connections__postgres")
    .delete()
    .eq("connection_id", connection.connectionId);
  await admin.from("connections").delete().eq("id", connection.connectionId);
  await admin.rpc("rpc_connections__delete_vault_secret", {
    p_secret_id: connection.vaultSecretId,
    p_workspace_id: workspaceId,
  });
}

/** A saved Postgres connection seeded straight into the database. */
export const PostgresConnectionSeed = { create, remove };
