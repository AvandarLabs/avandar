import { createClient } from "@supabase/supabase-js";
import { AvaSupabaseDBClient } from "@/db/supabase/AvaSupabaseDbClient.types";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "../helpers/supabaseAdminClient";
import { test as base, expect } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { LONG_WAIT } from "./helpers/timeouts";
import { getUserIdByEmail } from "./setup/e2eTestWorkspaceLifecycle";
import type { SupabaseClient } from "@supabase/supabase-js";

type ViewerMembershipSetup = {
  viewerUserId: string;
  /** True when this spec inserted membership (and profile / user_roles). */
  didInsertMembership: boolean;
};

type ViewerRlsFixtures = {
  /**
   * Test-scoped: ensures the secondary E2E user is a Global Viewer member,
   * then removes that membership when the membership was inserted here.
   */
  e2eViewerMembership: ViewerMembershipSetup & {
    admin: SupabaseClient;
    workspaceId: string;
  };
};

/**
 * Deletes the viewer's membership row for the workspace (cascades profiles
 * and user_roles). Used for teardown and for rollback after a failed seed.
 */
async function _deleteViewerMembershipRow(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
}): Promise<void> {
  const { error } = await options.supabaseAdminClient
    .from("workspace_memberships")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("user_id", options.viewerUserId);

  if (error) {
    throw new Error(`[e2e] viewer membership delete failed: ${error.message}`);
  }
}

/**
 * Resolves Supabase HTTP URL for browser-style clients.
 */
function _getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_API_URL;

  if (!url) {
    throw new Error("SUPABASE_URL or VITE_SUPABASE_API_URL is required.");
  }

  return url;
}

/**
 * Ensures the viewer user is a Global Viewer member of the workspace
 * (idempotent).
 *
 * @returns Whether this call inserted membership rows (caller must tear down
 *   when true so local DB state matches pre-test).
 */
async function _ensureViewerMembership(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerEmail: string;
}): Promise<ViewerMembershipSetup> {
  const viewerUserId = await getUserIdByEmail({
    supabaseAdminClient: options.supabaseAdminClient,
    email: options.viewerEmail,
  });

  const { data: existingMembership, error: existingError } =
    await options.supabaseAdminClient
      .from("workspace_memberships")
      .select("id")
      .eq("workspace_id", options.workspaceId)
      .eq("user_id", viewerUserId)
      .maybeSingle();

  if (existingError) {
    throw new Error(`[e2e] membership lookup failed: ${existingError.message}`);
  }

  if (existingMembership) {
    return { viewerUserId, didInsertMembership: false };
  }

  const { data: viewerGroup, error: groupError } =
    await options.supabaseAdminClient
      .from("role_groups")
      .select("id")
      .eq("workspace_id", options.workspaceId)
      .eq("name", "Global Viewer")
      .eq("is_builtin", true)
      .single();

  if (groupError || !viewerGroup) {
    throw new Error(
      `[e2e] Global Viewer role group missing: ${groupError?.message ?? ""}`,
    );
  }

  const { data: membership, error: membershipError } =
    await options.supabaseAdminClient
      .from("workspace_memberships")
      .insert({
        user_id: viewerUserId,
        workspace_id: options.workspaceId,
        role_group_id: viewerGroup.id,
      })
      .select("id")
      .single();

  if (membershipError || !membership) {
    throw new Error(
      `[e2e] viewer membership insert failed: ` +
        `${membershipError?.message ?? "no row"}`,
    );
  }

  const { error: profileError } = await options.supabaseAdminClient
    .from("user_profiles")
    .insert({
      user_id: viewerUserId,
      workspace_id: options.workspaceId,
      membership_id: membership.id,
      full_name: "E2E Viewer",
      display_name: "E2E Viewer",
    });

  if (profileError) {
    await _deleteViewerMembershipRow({
      supabaseAdminClient: options.supabaseAdminClient,
      workspaceId: options.workspaceId,
      viewerUserId,
    });
    throw new Error(
      `[e2e] viewer profile insert failed: ${profileError.message}`,
    );
  }

  const { error: roleError } = await options.supabaseAdminClient
    .from("user_roles")
    .insert({
      user_id: viewerUserId,
      workspace_id: options.workspaceId,
      membership_id: membership.id,
      role: "member",
    });

  if (roleError) {
    await _deleteViewerMembershipRow({
      supabaseAdminClient: options.supabaseAdminClient,
      workspaceId: options.workspaceId,
      viewerUserId,
    });
    throw new Error(
      `[e2e] viewer user_roles insert failed: ${roleError.message}`,
    );
  }

  return { viewerUserId, didInsertMembership: true };
}

const test = base.extend<ViewerRlsFixtures>({
  e2eViewerMembership: async ({ e2eWorkerDb }, use) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: supabaseAdminClient,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const viewerSetup = await _ensureViewerMembership({
      supabaseAdminClient: supabaseAdminClient,
      workspaceId,
      viewerEmail: e2eWorkerDb.secondaryUser.email,
    });

    await use({
      admin: supabaseAdminClient,
      workspaceId,
      viewerUserId: viewerSetup.viewerUserId,
      didInsertMembership: viewerSetup.didInsertMembership,
    });

    if (viewerSetup.didInsertMembership) {
      await _deleteViewerMembershipRow({
        supabaseAdminClient: supabaseAdminClient,
        workspaceId,
        viewerUserId: viewerSetup.viewerUserId,
      });
    }
  },
});

export { expect };

/**
 * "Matrix" here means a grid of permission checks: each row is an actor
 * (e.g. workspace owner vs viewer) and each column is a surface or action
 * (browser vs anon-key API). Each cell asserts allow vs deny under RLS. This
 * file is expected to grow more rows/columns over time; it currently encodes
 * a small subset of that grid.
 */
test.describe("permissions RLS matrix (owner vs viewer)", () => {
  test("owner reaches data manager; viewer cannot update workspace via API", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { admin, workspaceId } = e2eViewerMembership;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager`);

    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/data-manager`),
      { timeout: LONG_WAIT },
    );

    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!anonKey) {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY is required for viewer API test.",
      );
    }

    const viewerClient = createClient(_getSupabaseUrl(), anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signInError } = await viewerClient.auth.signInWithPassword({
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
    });

    if (signInError) {
      throw new Error(`viewer sign-in failed: ${signInError.message}`);
    }

    const { data: workspaceBefore, error: readBeforeError } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (readBeforeError || !workspaceBefore) {
      throw new Error(
        `[e2e] workspace read failed: ${readBeforeError?.message ?? "no row"}`,
      );
    }

    const { data: updateRows, error: updateError } = await viewerClient
      .from("workspaces")
      .update({ name: "should-not-apply" })
      .eq("id", workspaceId)
      .select("id");

    expect(updateError ?? null).toBeNull();
    expect(updateRows ?? []).toEqual([]);

    const { data: workspaceAfter, error: readAfterError } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (readAfterError || !workspaceAfter) {
      throw new Error(
        `[e2e] workspace re-read failed: ${readAfterError?.message ?? "no row"}`,
      );
    }

    expect(workspaceAfter.name).toBe(workspaceBefore.name);
  });
});
