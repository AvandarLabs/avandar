import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { SupabaseClient } from "@supabase/supabase-js";

type DashboardOwner = {
  profileId: string;
  userId: string;
};

type InsertDashboardOptions = {
  admin: SupabaseClient;
  config: Record<string, unknown>;
  failureMessage: string;
  isRestricted: boolean;
  missingRowMessage: string;
  name: string;
  owner: DashboardOwner;
  slug: string;
  workspaceId: string;
} & (
  | { snapshotRevision?: undefined; visibility: "draft" }
  | {
      snapshotRevision: string;
      visibility: Exclude<Dashboard.Visibility, "draft">;
    }
);

async function _getOwner(
  options: Readonly<{
    admin: SupabaseClient;
    ownerEmail: string;
    workspaceId: string;
  }>,
): Promise<DashboardOwner> {
  const { data: userIdRaw, error: userError } = await options.admin.rpc(
    "util__get_user_id_by_email",
    { p_email: options.ownerEmail },
  );
  if (userError) {
    throw new Error(
      `Could not find owner user by email "${options.ownerEmail}": ${userError.message}`,
    );
  }
  const userId = userIdRaw as string;
  const { data: profile, error: profileError } = await options.admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", options.workspaceId)
    .maybeSingle();
  if (profileError) {
    throw new Error(`profile lookup failed: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error(
      `No user_profile row for user_id ${userId} in workspace ${options.workspaceId}`,
    );
  }
  return { profileId: profile.id, userId };
}

function _makeDashboardConfigFromContent(
  options: Readonly<{ content: readonly unknown[]; title: string }>,
): Record<string, unknown> {
  return {
    root: {
      props: {
        schemaVersion: 2,
        author: "",
        containerMaxWidth: { unit: "%", value: 100 },
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        title: options.title,
        verticalPadding: "lg",
      },
    },
    content: [...options.content],
  };
}

async function _insertDashboard(
  options: Readonly<InsertDashboardOptions>,
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await options.admin
    .from("dashboards")
    .insert({
      workspace_id: options.workspaceId,
      owner_id: options.owner.userId,
      owner_profile_id: options.owner.profileId,
      name: options.name,
      slug: options.slug,
      visibility: options.visibility,
      snapshot_revision: options.snapshotRevision,
      is_restricted: options.isRestricted,
      config: options.config,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`${options.failureMessage}: ${error.message}`);
  }
  if (!data) {
    throw new Error(options.missingRowMessage);
  }
  return data.id;
}

/** Shared setup operations for dashboard E2E fixtures. */
export const DashboardSeedHelpers = {
  /** Resolve the seeded dashboard owner's user and profile IDs. */
  getOwner: _getOwner,
  /** Insert a dashboard row for a browser test fixture. */
  insertDashboard: _insertDashboard,
  /** Build the persisted dashboard config for seeded content. */
  makeDashboardConfigFromContent: _makeDashboardConfigFromContent,
};
