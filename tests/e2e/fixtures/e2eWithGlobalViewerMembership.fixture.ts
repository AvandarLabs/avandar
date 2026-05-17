import { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "../helpers/supabaseAdminClient";
import { getUserIdByEmail } from "../setup/e2eTestWorkspaceLifecycle";
import { test as base, expect } from "./e2e.fixture";
import type { SupabaseClient } from "@supabase/supabase-js";

export { expect };

type ViewerMembershipSetup = {
  viewerUserId: string;
  /** True when this fixture inserted membership (and profile). */
  didInsertMembership: boolean;
};

export type E2EGlobalViewerMembership = ViewerMembershipSetup & {
  admin: SupabaseClient;
  workspaceId: string;
};

type E2eGlobalViewerFixtures = {
  /**
   * Test-scoped: ensures the secondary E2E user is a Global Viewer member,
   * then removes that membership when this fixture inserted or replaced it.
   */
  e2eViewerMembership: E2EGlobalViewerMembership;
};

/**
 * Deletes the viewer's membership row for the workspace (cascades profiles).
 * Used for teardown and for rollback after a failed seed.
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
 * Ensures the user is a Global Viewer member of the workspace. When a
 * membership exists with a different role group, it is removed and recreated
 * so the user matches the built-in Global Viewer matrix.
 *
 * @returns Whether this call inserted membership rows (caller must tear down
 *   when true so local DB state matches pre-test).
 */
async function _ensureUserIsMemberAndViewer(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerEmail: string;
}): Promise<ViewerMembershipSetup> {
  const viewerUserId = await getUserIdByEmail({
    supabaseAdminClient: options.supabaseAdminClient,
    email: options.viewerEmail,
  });

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

  const { data: existingMembership, error: existingError } =
    await options.supabaseAdminClient
      .from("workspace_memberships")
      .select("id, role_group_id")
      .eq("workspace_id", options.workspaceId)
      .eq("user_id", viewerUserId)
      .maybeSingle();

  if (existingError) {
    throw new Error(`[e2e] membership lookup failed: ${existingError.message}`);
  }

  if (
    existingMembership &&
    existingMembership.role_group_id === viewerGroup.id
  ) {
    return { viewerUserId, didInsertMembership: false };
  }

  if (existingMembership) {
    await _deleteViewerMembershipRow({
      supabaseAdminClient: options.supabaseAdminClient,
      workspaceId: options.workspaceId,
      viewerUserId,
    });
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

  return { viewerUserId, didInsertMembership: true };
}

/**
 * Base E2E test plus a per-test fixture that ensures the secondary user is a
 * Global Viewer member (inserting or replacing a non-viewer membership), and
 * removes that membership on teardown when this fixture inserted it.
 */
export const test = base.extend<E2eGlobalViewerFixtures>({
  e2eViewerMembership: async ({ e2eWorkerDb }, use) => {
    const supabaseAdminClient = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: supabaseAdminClient,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const viewerSetup = await _ensureUserIsMemberAndViewer({
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
