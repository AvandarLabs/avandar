/**
 * Returns the decrypted password behind a saved Postgres connection's Vault
 * secret, by the `vault_secret_id` stored on `connections__postgres` - but
 * only when that `vault_secret_id` actually belongs to a `connections__postgres`
 * row scoped to `p_workspace_id`. This check is redundant with the one real
 * caller's own scoping (`postgresConnectionRow.ts` already reads the row via
 * a workspace-scoped lookup before ever passing its `vault_secret_id` here),
 * but the redundancy is the point: the single-caller invariant this RPC used
 * to rely on entirely is now also enforced here, so a future careless caller
 * cannot bypass it just by skipping that scoping on its own end.
 *
 * This is the only code path allowed to read `vault.decrypted_secrets`:
 * `security definer`, and restricted to `service_role` by the revoke/grant
 * pair below - `anon` and `authenticated`
 * have no EXECUTE grant on this function at all, so even a bug that let an
 * unauthorized caller reach it could not leak a password to the browser.
 * Called from the `connectors` edge function using `SupabaseAdmin`,
 * only after that function's own `util__auth_user_meets_min_app_role` check
 * has passed for the caller's own session.
 *
 * Postgres-specific today, not generic across connector types: the scoping
 * check queries `connections__postgres` by name, the only satellite table
 * that exists. A second connector type with its own Vault-backed credential
 * will need its own equivalent check added here (an `or exists (...)`
 * against its own satellite table) - this function does not automatically
 * cover it.
 *
 * @param p_vault_secret_id The `connections__postgres.vault_secret_id`
 *   to decrypt.
 * @param p_workspace_id The workspace the caller is acting in. The secret is
 *   only decrypted when this matches the workspace of the connection row
 *   that actually owns `p_vault_secret_id`.
 * @returns The decrypted password, or null if no such secret exists, or it
 *   does not belong to a connection in this workspace.
 */
create or replace function public.rpc_connections__get_decrypted_secret (
  p_vault_secret_id uuid,
  p_workspace_id uuid
) returns text language plpgsql security definer
set
  search_path = public, vault as $$
declare
  v_secret text;
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_vault_secret_id
      and workspace_id = p_workspace_id
  ) then
    return null;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_vault_secret_id;

  return v_secret;
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the single path allowed to decrypt a connection secret.
revoke
execute on function public.rpc_connections__get_decrypted_secret (uuid, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_connections__get_decrypted_secret (uuid, uuid) to service_role;
