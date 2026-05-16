import { makeSet } from "@utils";
import {
  createSupabaseAdminClient,
  deleteWorkspaceTreeForE2EById,
} from "../../helpers/supabaseAdminClient";
import { ensureWorkspaceSubscriptionForE2E } from "./ensureWorkspaceSubscriptionForE2E";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

const E2E_TEST_WORKSPACE_DISPLAY_NAME = "E2E Test Workspace";

/**
 * Resolves a user's auth id
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.email User email.
 */
export async function getUserIdByEmail(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  email: string;
}): Promise<string> {
  const { data: userId, error: userRpcError } =
    await options.supabaseAdminClient.rpc("util__get_user_id_by_email", {
      p_email: options.email,
    });

  if (userRpcError) {
    throw new Error(`[e2e] user lookup failed: ${userRpcError.message}`);
  }

  if (userId === null || userId === undefined || userId === "") {
    throw new Error(`[e2e] user id missing for ${options.email}.`);
  }

  return userId;
}

/**
 * Inserts a workspace plus membership, profile, and admin role for the owner.
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.ownerEmail Workspace owner email (must exist in auth).
 * @param options.workspaceSlug Unique slug for the URL.
 */
async function _insertE2EWorkspaceForOwner(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  ownerEmail: string;
  workspaceSlug: string;
}): Promise<void> {
  const { supabaseAdminClient: admin, ownerEmail, workspaceSlug } = options;
  const userId = await getUserIdByEmail({
    supabaseAdminClient: admin,
    email: ownerEmail,
  });

  const { data: insertedWorkspace, error: insertWorkspaceError } = await admin
    .from("workspaces")
    .insert({
      name: E2E_TEST_WORKSPACE_DISPLAY_NAME,
      slug: workspaceSlug,
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
 * Deletes a workspace tree when the row exists and is owned by the given
 * email. No-op when missing; warns when owned by someone else.
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.slug Workspace slug.
 * @param options.ownerEmail Expected owner email.
 */
export async function deleteUserOwnedWorkspaceTreeBySlug(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  slug: string;
  ownerEmail: string;
}): Promise<void> {
  const { supabaseAdminClient, slug, ownerEmail } = options;
  const userId = await getUserIdByEmail({
    supabaseAdminClient,
    email: ownerEmail,
  });

  const { data: row, error: lookupError } = await supabaseAdminClient
    .from("workspaces")
    .select("id, owner_id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    console.warn(
      `[e2e] deleteUserOwnedWorkspaceTreeBySlug lookup (${slug}): ` +
        `${lookupError.message}`,
    );
    return;
  }

  if (!row) {
    return;
  }

  if (row.owner_id !== userId) {
    console.warn(
      `[e2e] skip delete: workspace "${slug}" is not owned by ${ownerEmail}.`,
    );
    return;
  }

  await deleteWorkspaceTreeForE2EById({
    supabaseAdminClient: supabaseAdminClient,
    workspaceId: row.id,
  });
}

/**
 * Deletes the workspace for this slug when present and owned by ownerEmail.
 *
 * @param options.ownerEmail Owner email.
 * @param options.workspaceSlug Workspace slug.
 */
export async function teardownE2EWorkspaceBySlug(options: {
  ownerEmail: string;
  workspaceSlug: string;
}): Promise<void> {
  try {
    const supabaseAdminClient = createSupabaseAdminClient();
    await deleteUserOwnedWorkspaceTreeBySlug({
      supabaseAdminClient,
      slug: options.workspaceSlug,
      ownerEmail: options.ownerEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[e2e] teardownE2EWorkspaceBySlug: ${message}`);
  }
}

/**
 * Deletes any existing workspace with this slug, inserts a fresh one, and adds
 * a fake Polar subscription row for free-plan limits.
 *
 * @param options.ownerEmail Primary E2E user email (workspace owner).
 * @param options.workspaceSlug Slug for the shared E2E workspace.
 */
export async function provisionFreshE2EWorkspaceForOwner(options: {
  ownerEmail: string;
  workspaceSlug: string;
}): Promise<void> {
  const supabaseAdminClient = createSupabaseAdminClient();

  await deleteUserOwnedWorkspaceTreeBySlug({
    supabaseAdminClient,
    slug: options.workspaceSlug,
    ownerEmail: options.ownerEmail,
  });
  await _insertE2EWorkspaceForOwner({
    supabaseAdminClient: supabaseAdminClient,
    ownerEmail: options.ownerEmail,
    workspaceSlug: options.workspaceSlug,
  });
  await ensureWorkspaceSubscriptionForE2E({
    workspaceSlug: options.workspaceSlug,
    polarCustomerEmail: options.ownerEmail,
  });
}

/**
 * Deletes every workspace owned by ownerEmail whose slug equals workspaceSlug
 * or starts with `e2e-org-` (workspace-create leftovers).
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.ownerEmail Owner email.
 * @param options.workspaceSlug Exact slug of the shared worker workspace.
 */
export async function purgeE2EWorkspacesForOwner(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  ownerEmail: string;
  workspaceSlug: string;
}): Promise<void> {
  const { supabaseAdminClient: admin, ownerEmail, workspaceSlug } = options;
  const userId = await getUserIdByEmail({
    supabaseAdminClient: admin,
    email: ownerEmail,
  });

  const { data: exactRows, error: exactError } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .eq("slug", workspaceSlug);

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

  const ids = makeSet(exactRows.concat(prefixRows), {
    key: "id",
  });

  await Promise.all(
    [...ids].map((workspaceId) => {
      return deleteWorkspaceTreeForE2EById({
        supabaseAdminClient: admin,
        workspaceId,
      });
    }),
  );

  console.log(`[e2e] Purged ${ids.size} workspace(s) for ${ownerEmail}.`);
}

/**
 * Best-effort removal of known E2E workspaces for the given owner emails. Used
 * by global teardown when a prior run exited without worker teardown.
 *
 * We are okay with ignoring thrown errors here because this is the cleanup
 * step. We don't want spurious errors on teardown to turn a green test suite
 * into a red one.
 *
 * @param options.ownerEmails Emails whose owned `e2e-test-workspace%` and
 *   `e2e-org-%` slugs should be removed.
 */
export async function bestEffortPurgeE2EWorkspacesForOwners(options: {
  ownerEmails: readonly string[];
}): Promise<void> {
  const supabaseAdminClient = createSupabaseAdminClient();

  for (const email of options.ownerEmails) {
    let userId: string;
    try {
      userId = await getUserIdByEmail({
        supabaseAdminClient: supabaseAdminClient,
        email,
      });
    } catch {
      continue;
    }

    const { data: seededRows, error: seededError } = await supabaseAdminClient
      .from("workspaces")
      .select("id, slug")
      .eq("owner_id", userId)
      .like("slug", "e2e-test-workspace%");

    if (seededError) {
      console.warn(
        `[e2e] best-effort purge list (seeded) for ${email}: ` +
          `${seededError.message}`,
      );
      continue;
    }

    const { data: orgRows, error: orgError } = await supabaseAdminClient
      .from("workspaces")
      .select("id, slug")
      .eq("owner_id", userId)
      .like("slug", "e2e-org-%");

    if (orgError) {
      console.warn(
        `[e2e] best-effort purge list (org) for ${email}: ${orgError.message}`,
      );
      continue;
    }

    const byId = new Map<string, { id: string; slug: string }>();
    for (const row of [...(seededRows ?? []), ...(orgRows ?? [])]) {
      byId.set(row.id, row);
    }

    await Promise.all(
      [...byId.values()].map(async (row) => {
        try {
          await deleteWorkspaceTreeForE2EById({
            supabaseAdminClient,
            workspaceId: row.id,
          });
        } catch (cleanupError) {
          const message =
            cleanupError instanceof Error ?
              cleanupError.message
            : String(cleanupError);
          console.warn(`[e2e] best-effort purge ${row.slug}: ${message}`);
        }
      }),
    );
  }
}
