import {
  createSupabaseAdminClient,
  deleteWorkspaceTreeForE2EById,
} from "../../helper/supabaseAdminClient";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SEEDED_WORKSPACE_SLUG,
} from "./e2e-credentials";
import { ensureWorkspaceSubscriptionForE2E } from "./ensureWorkspaceSubscriptionForE2E";
import type { SupabaseClient } from "@supabase/supabase-js";

const E2E_TEST_WORKSPACE_DISPLAY_NAME = "E2E Test Workspace";

/**
 * Resolves the primary E2E user's auth user id via RPC.
 *
 * @param admin Admin Supabase client.
 */
async function _getPrimaryE2EUserId(admin: SupabaseClient): Promise<string> {
  const { data: userId, error: userRpcError } = await admin.rpc(
    "util__get_user_id_by_email",
    { p_email: E2E_PRIMARY_USER_EMAIL },
  );

  if (userRpcError) {
    throw new Error(
      `[e2e] primary user lookup failed: ${userRpcError.message}`,
    );
  }

  if (userId === null || userId === undefined || userId === "") {
    throw new Error(
      "[e2e] primary test user id missing; run ensureTestUser first.",
    );
  }

  return userId;
}

/**
 * Inserts the `e2e-test-workspace` row plus membership, profile, and admin
 * role for the primary E2E user. Caller must ensure the slug is unused.
 *
 * @param admin Admin Supabase client.
 */
async function _insertPrimaryUserE2eTestWorkspace(
  admin: SupabaseClient,
): Promise<void> {
  const userId = await _getPrimaryE2EUserId(admin);

  const { data: insertedWorkspace, error: insertWorkspaceError } = await admin
    .from("workspaces")
    .insert({
      name: E2E_TEST_WORKSPACE_DISPLAY_NAME,
      slug: E2E_SEEDED_WORKSPACE_SLUG,
      owner_id: userId,
    })
    .select("id")
    .single();

  if (insertWorkspaceError || !insertedWorkspace) {
    throw new Error(
      `[e2e] workspace insert failed: ` +
        `${insertWorkspaceError?.message ?? "no row"}`,
    );
  }

  const workspaceId = insertedWorkspace.id;

  const { data: globalAdminGroup, error: globalAdminGroupError } = await admin
    .from("role_groups")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", "Global Admin")
    .eq("is_builtin", true)
    .single();

  if (globalAdminGroupError || !globalAdminGroup) {
    throw new Error(
      `[e2e] Global Admin role_group lookup failed: ` +
        `${globalAdminGroupError?.message ?? "no row"}`,
    );
  }

  const { data: membership, error: membershipError } = await admin
    .from("workspace_memberships")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      role_group_id: globalAdminGroup.id,
    })
    .select("id")
    .single();

  if (membershipError || !membership) {
    throw new Error(
      `[e2e] membership insert failed: ` +
        `${membershipError?.message ?? "no row"}`,
    );
  }

  const { error: profileError } = await admin.from("user_profiles").insert({
    user_id: userId,
    workspace_id: workspaceId,
    membership_id: membership.id,
    full_name: E2E_TEST_WORKSPACE_DISPLAY_NAME,
    display_name: E2E_TEST_WORKSPACE_DISPLAY_NAME,
  });

  if (profileError) {
    throw new Error(
      `[e2e] user_profiles insert failed: ${profileError.message}`,
    );
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    workspace_id: workspaceId,
    membership_id: membership.id,
    role: "admin",
  });

  if (roleError) {
    throw new Error(`[e2e] user_roles insert failed: ${roleError.message}`);
  }
}

/**
 * Deletes a workspace by slug when it exists and is owned by the primary E2E
 * user. No-op when missing; warns when owned by someone else.
 *
 * @param options.admin Admin Supabase client.
 * @param options.slug Workspace slug from the URL.
 */
export async function deletePrimaryUserE2EWorkspaceTreeBySlug(options: {
  admin: SupabaseClient;
  slug: string;
}): Promise<void> {
  const { admin, slug } = options;
  const userId = await _getPrimaryE2EUserId(admin);

  const { data: row, error: lookupError } = await admin
    .from("workspaces")
    .select("id, owner_id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    console.warn(
      `[e2e] deletePrimaryUserE2EWorkspaceTreeBySlug lookup (${slug}): ` +
        `${lookupError.message}`,
    );
    return;
  }

  if (!row) {
    return;
  }

  if (row.owner_id !== userId) {
    console.warn(
      `[e2e] skip delete: workspace "${slug}" ` +
        `is not owned by ${E2E_PRIMARY_USER_EMAIL}.`,
    );
    return;
  }

  await deleteWorkspaceTreeForE2EById({
    admin,
    workspaceId: row.id,
  });
}

/**
 * Deletes the primary user's seeded E2E workspace by slug when present.
 *
 * @param options.admin Admin Supabase client.
 */
export async function deletePrimaryUserE2EWorkspaceBySlug(options: {
  admin: SupabaseClient;
}): Promise<void> {
  await deletePrimaryUserE2EWorkspaceTreeBySlug({
    admin: options.admin,
    slug: E2E_SEEDED_WORKSPACE_SLUG,
  });
}

/**
 * Deletes any leftover workspace, inserts a fresh one, and adds a fake Polar
 * subscription row for free-plan limits.
 */
// eslint-disable-next-line max-len
export async function provisionFreshPrimaryUserE2ETestWorkspace(): Promise<void> {
  const admin = createSupabaseAdminClient();

  await deletePrimaryUserE2EWorkspaceBySlug({ admin });
  await _insertPrimaryUserE2eTestWorkspace(admin);
  await ensureWorkspaceSubscriptionForE2E();
}

/**
 * Removes the primary user's dedicated E2E workspace after a test (and after
 * the full run via global teardown).
 */
export async function teardownPrimaryUserE2ETestWorkspace(): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await deletePrimaryUserE2EWorkspaceBySlug({ admin });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[e2e] teardownPrimaryUserE2ETestWorkspace: ${message}`);
  }
}

/**
 * Deletes every workspace owned by the primary E2E user whose slug is either
 * {@link E2E_SEEDED_WORKSPACE_SLUG} or starts with `e2e-org-` (Playwright
 * workspace-create leftovers).
 *
 * @param options.admin Admin Supabase client.
 */
export async function purgePrimaryUserE2EWorkspaces(options: {
  admin: SupabaseClient;
}): Promise<void> {
  const { admin } = options;
  const userId = await _getPrimaryE2EUserId(admin);

  const { data: exactRows, error: exactError } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .eq("slug", E2E_SEEDED_WORKSPACE_SLUG);

  if (exactError) {
    throw new Error(`[e2e] purge exact slug failed: ${exactError.message}`);
  }

  const { data: prefixRows, error: prefixError } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .like("slug", "e2e-org-%");

  if (prefixError) {
    throw new Error(`[e2e] purge prefix slug failed: ${prefixError.message}`);
  }

  const ids = new Set<string>();
  exactRows.forEach((row) => {
    return ids.add(row.id);
  });
  prefixRows.forEach((row) => {
    return ids.add(row.id);
  });

  for (const workspaceId of ids) {
    await deleteWorkspaceTreeForE2EById({ admin, workspaceId });
  }

  console.log(
    `[e2e] Purged ${ids.size} workspace(s) for ${E2E_PRIMARY_USER_EMAIL}.`,
  );
}
