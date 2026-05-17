import { Permissions } from "$/models/Permissions/Permissions";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberBuiltinRoleGroup,
  assignE2ESecondaryMemberCustomMatrix,
  createRolesMatrixWithoutApp,
  createSingleAppAdminRolesMatrix,
  createSingleAppEditorRolesMatrix,
  createSingleAppViewerRolesMatrix,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import { createE2ESupabaseViewerClient } from "./helpers/supabase";
import { LONG_WAIT } from "./helpers/timeouts";
import {
  expectWorkspaceAppAccessAllowed,
  expectWorkspaceAppAccessDenied,
  WORKSPACE_APP_ROUTES,
} from "./helpers/workspaceAppRouteExpectations";
import type { WorkspaceAppRouteCase } from "./helpers/workspaceAppRouteExpectations";
import type { AppType } from "$/models/Permissions/Permissions.types";

function _appRouteForType(app: AppType): WorkspaceAppRouteCase | undefined {
  const routes: Record<AppType, WorkspaceAppRouteCase | undefined> = {
    data_sources: WORKSPACE_APP_ROUTES.dataSources,
    data_explorer: WORKSPACE_APP_ROUTES.dataExplorer,
    dashboards: WORKSPACE_APP_ROUTES.dashboards,
    settings: undefined,
  };
  return routes[app];
}

test.describe("workspace app route permission matrix", () => {
  test.beforeEach(async ({ page, e2eWorkerDb, e2eViewerMembership }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    void e2eViewerMembership;
  });

  Permissions.RestrictableApps.forEach((app) => {
    const route = _appRouteForType(app);
    if (!route) {
      return;
    }

    test(`denies ${route.label} when member lacks ${app} viewer`, async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: createRolesMatrixWithoutApp(app),
      });

      try {
        await expectWorkspaceAppAccessDenied(page, {
          workspaceSlug: e2eWorkerDb.workspaceSlug,
          appPath: route.path,
        });
      } finally {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
    });

    test(`allows ${route.label} for ${app} viewer only`, async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: createSingleAppViewerRolesMatrix(app),
      });

      try {
        await expectWorkspaceAppAccessAllowed(page, {
          workspaceSlug: e2eWorkerDb.workspaceSlug,
          appPath: route.path,
          allowedUrlPattern: route.allowedUrlPattern,
        });
      } finally {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
    });

    test(`allows ${route.label} for ${app} editor`, async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: createSingleAppEditorRolesMatrix(app),
      });

      try {
        await expectWorkspaceAppAccessAllowed(page, {
          workspaceSlug: e2eWorkerDb.workspaceSlug,
          appPath: route.path,
          allowedUrlPattern: route.allowedUrlPattern,
        });
      } finally {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
    });

    test(`allows ${route.label} for ${app} admin`, async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        matrix: createSingleAppAdminRolesMatrix(app),
      });

      try {
        await expectWorkspaceAppAccessAllowed(page, {
          workspaceSlug: e2eWorkerDb.workspaceSlug,
          appPath: route.path,
          allowedUrlPattern: route.allowedUrlPattern,
        });
      } finally {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: e2eViewerMembership.admin,
          workspaceId: e2eViewerMembership.workspaceId,
          viewerUserId: e2eViewerMembership.viewerUserId,
          ...assignResult,
        });
      }
    });
  });

  test("denies workspace settings for Global Viewer", async ({
    page,
    e2eWorkerDb,
  }) => {
    await expectWorkspaceAppAccessDenied(page, {
      workspaceSlug: e2eWorkerDb.workspaceSlug,
      appPath: WORKSPACE_APP_ROUTES.settings.path,
    });
  });

  test("denies workspace settings for Global Editor", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const assignResult = await assignE2ESecondaryMemberBuiltinRoleGroup({
      supabaseAdminClient: e2eViewerMembership.admin,
      workspaceId: e2eViewerMembership.workspaceId,
      viewerUserId: e2eViewerMembership.viewerUserId,
      builtinName: "Global Editor",
    });

    try {
      await expectWorkspaceAppAccessDenied(page, {
        workspaceSlug: e2eWorkerDb.workspaceSlug,
        appPath: WORKSPACE_APP_ROUTES.settings.path,
      });
    } finally {
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        ...assignResult,
      });
    }
  });

  test("allows workspace settings for Global Admin", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const assignResult = await assignE2ESecondaryMemberBuiltinRoleGroup({
      supabaseAdminClient: e2eViewerMembership.admin,
      workspaceId: e2eViewerMembership.workspaceId,
      viewerUserId: e2eViewerMembership.viewerUserId,
      builtinName: "Global Admin",
    });

    try {
      await expectWorkspaceAppAccessAllowed(page, {
        workspaceSlug: e2eWorkerDb.workspaceSlug,
        appPath: WORKSPACE_APP_ROUTES.settings.path,
        allowedUrlPattern: WORKSPACE_APP_ROUTES.settings.allowedUrlPattern,
      });

      await expect(
        page.getByRole("heading", { name: "Workspace Users" }),
      ).toBeVisible({ timeout: LONG_WAIT });
    } finally {
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: e2eViewerMembership.admin,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
        ...assignResult,
      });
    }
  });
});

test.describe("resource share bypasses missing app role (API)", () => {
  test("dataset viewer share grants SELECT without data_sources app role", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const assignResult = await assignE2ESecondaryMemberCustomMatrix({
      supabaseAdminClient: admin,
      workspaceId,
      viewerUserId,
      matrix: createRolesMatrixWithoutApp("data_sources"),
    });

    const { data: ownerMembership } = await admin
      .from("workspace_memberships")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .single();

    if (!ownerMembership) {
      throw new Error("[e2e] owner membership missing");
    }

    const { data: dataset, error: datasetError } = await admin
      .from("datasets")
      .insert({
        workspace_id: workspaceId,
        owner_id: ownerMembership.user_id,
        name: "E2E resource share dataset",
        is_restricted: true,
      })
      .select("id")
      .single();

    if (datasetError || !dataset) {
      throw new Error(
        `[e2e] dataset insert failed: ${datasetError?.message ?? ""}`,
      );
    }

    const { data: otherDataset, error: otherDatasetError } = await admin
      .from("datasets")
      .insert({
        workspace_id: workspaceId,
        owner_id: ownerMembership.user_id,
        name: "E2E resource share other dataset",
        is_restricted: true,
      })
      .select("id")
      .single();

    if (otherDatasetError || !otherDataset) {
      throw new Error(
        `[e2e] other dataset insert failed: ${otherDatasetError?.message ?? ""}`,
      );
    }

    const { error: shareError } = await admin.from("resource_shares").insert({
      resource_type: "dataset",
      resource_id: dataset.id,
      workspace_id: workspaceId,
      principal_type: "user",
      principal_user_id: viewerUserId,
      role: "viewer",
    });

    if (shareError) {
      throw new Error(
        `[e2e] resource share insert failed: ${shareError.message}`,
      );
    }

    const viewerClient = await createE2ESupabaseViewerClient({
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    try {
      const { data: sharedRow, error: sharedReadError } = await viewerClient
        .from("datasets")
        .select("id")
        .eq("id", dataset.id)
        .maybeSingle();

      expect(sharedReadError ?? null).toBeNull();
      expect(sharedRow?.id).toBe(dataset.id);

      const { data: blockedRows, error: blockedReadError } = await viewerClient
        .from("datasets")
        .select("id")
        .eq("id", otherDataset.id);

      expect(blockedReadError ?? null).toBeNull();
      expect(blockedRows ?? []).toEqual([]);

      await expectWorkspaceAppAccessDenied(page, {
        workspaceSlug: e2eWorkerDb.workspaceSlug,
        appPath: WORKSPACE_APP_ROUTES.dataSources.path,
      });
    } finally {
      await admin.from("datasets").delete().eq("id", dataset.id);
      await admin.from("datasets").delete().eq("id", otherDataset.id);
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        ...assignResult,
      });
    }
  });

  (["editor", "admin"] as const).forEach((role) => {
    test(`dataset ${role} share grants UPDATE on restricted dataset`, async ({
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
      const assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        matrix: createRolesMatrixWithoutApp("data_sources"),
      });

      const { data: ownerMembership } = await admin
        .from("workspace_memberships")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .limit(1)
        .single();

      if (!ownerMembership) {
        throw new Error("[e2e] owner membership missing");
      }

      const { data: dataset, error: datasetError } = await admin
        .from("datasets")
        .insert({
          workspace_id: workspaceId,
          owner_id: ownerMembership.user_id,
          name: `E2E ${role} share dataset`,
          is_restricted: true,
        })
        .select("id, name")
        .single();

      if (datasetError || !dataset) {
        throw new Error(
          `[e2e] dataset insert failed: ${datasetError?.message ?? ""}`,
        );
      }

      const { error: shareError } = await admin.from("resource_shares").insert({
        resource_type: "dataset",
        resource_id: dataset.id,
        workspace_id: workspaceId,
        principal_type: "user",
        principal_user_id: viewerUserId,
        role,
      });

      if (shareError) {
        throw new Error(
          `[e2e] resource share insert failed: ${shareError.message}`,
        );
      }

      const viewerClient = await createE2ESupabaseViewerClient({
        email: e2eWorkerDb.secondaryUser.email,
        password: e2eWorkerDb.secondaryUser.password,
      });

      const updatedName = `${dataset.name} updated`;

      try {
        const { data: updateRows, error: updateError } = await viewerClient
          .from("datasets")
          .update({ name: updatedName })
          .eq("id", dataset.id)
          .select("id, name");

        expect(updateError ?? null).toBeNull();
        expect(updateRows?.[0]?.name).toBe(updatedName);
      } finally {
        await admin.from("datasets").delete().eq("id", dataset.id);
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: admin,
          workspaceId,
          viewerUserId,
          ...assignResult,
        });
      }
    });
  });
});
