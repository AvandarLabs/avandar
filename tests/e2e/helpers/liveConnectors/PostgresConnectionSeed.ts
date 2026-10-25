import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A seeded connection, with the ids `PostgresConnectionSeed.remove` needs. */
export type SeededPostgresConnection = {
  connectionId: string;
  vaultSecretId: string;
};

type WorkspaceAdminOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
};

/**
 * Inserts the `connections` and `connections__postgres` rows for a connection
 * whose password is the Vault secret `vaultSecretId`. Removes the first row
 * again if the second insert fails.
 *
 * @returns The new connection's id.
 */
async function _insertConnectionRows(
  options: Readonly<WorkspaceAdminOptions & { vaultSecretId: string }>,
): Promise<string> {
  const { supabaseAdminClient, workspaceId } = options;
  const { data: connection, error: connectionError } = await supabaseAdminClient
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

  const { error: postgresError } = await supabaseAdminClient
    .from("connections__postgres")
    .insert({
      connection_id: connection.id,
      workspace_id: workspaceId,
      host: "db.e2e-fixture.invalid",
      port: 5432,
      database_name: "reporting",
      username: "readonly_user",
      ssl_mode: "require",
      vault_secret_id: options.vaultSecretId,
      last_verified_at: new Date().toISOString(),
    });
  if (postgresError) {
    await supabaseAdminClient
      .from("connections")
      .delete()
      .eq("id", connection.id);
    throw new Error(
      `connections__postgres seed failed: ${postgresError.message}`,
    );
  }
  return connection.id;
}

async function _create(
  options: Readonly<WorkspaceAdminOptions>,
): Promise<SeededPostgresConnection> {
  const { supabaseAdminClient, workspaceId } = options;
  const { data: vaultSecretId, error: secretError } =
    await supabaseAdminClient.rpc("rpc_connections__create_vault_secret", {
      p_secret: "e2e-throwaway-password",
      p_name: `e2e-postgres-connector-${Date.now()}`,
      p_description:
        "Created by a Postgres connector e2e spec; safe to delete.",
    });
  if (secretError || !vaultSecretId) {
    throw new Error(`vault secret seed failed: ${secretError?.message}`);
  }

  // A failed insert must not leave the secret behind, since the caller has no
  // id to clean it up with.
  try {
    const connectionId = await _insertConnectionRows({
      ...options,
      vaultSecretId,
    });
    return { connectionId, vaultSecretId };
  } catch (error) {
    await supabaseAdminClient.rpc("rpc_connections__delete_vault_secret", {
      p_secret_id: vaultSecretId,
      p_workspace_id: workspaceId,
    });
    throw error;
  }
}

async function _remove(
  options: Readonly<
    WorkspaceAdminOptions & { connection: SeededPostgresConnection }
  >,
): Promise<void> {
  const { supabaseAdminClient, connection, workspaceId } = options;

  // Children before the parent: `connections__postgres.connection_id` is a
  // foreign key onto `connections.id`.
  await supabaseAdminClient
    .from("connections__postgres")
    .delete()
    .eq("connection_id", connection.connectionId);
  await supabaseAdminClient
    .from("connections")
    .delete()
    .eq("id", connection.connectionId);
  await supabaseAdminClient.rpc("rpc_connections__delete_vault_secret", {
    p_secret_id: connection.vaultSecretId,
    p_workspace_id: workspaceId,
  });
}

/** A saved Postgres connection seeded straight into the database. */
export const PostgresConnectionSeed = {
  /**
   * Seeds one saved Postgres connection for the workspace, with a real Vault
   * secret. The password is never dialed, since every spec stubs the
   * database round trip, but the foreign keys and the RLS and Vault shape are
   * real. Leaves nothing behind if it fails.
   */
  create: _create,

  /**
   * Deletes a seeded connection's rows and the Vault secret they point at.
   * Delete the datasets imported through it first: a Postgres dataset's
   * foreign key points at its connection.
   */
  remove: _remove,
};
