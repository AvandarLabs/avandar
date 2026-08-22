import type { APIRequestContext } from "@playwright/test";

import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createE2ESupabaseViewerClient } from "./helpers/supabase";

const PRIVATE_BUCKET = "published-private";

type AdminClient = Parameters<typeof seedDashboard>[0]["admin"];

async function _uploadPrivateSnapshot(
  options: Readonly<{
    admin: AdminClient;
    ownerEmail: string;
    workspaceId: string;
  }>,
): Promise<{ dashboardId: string; objectPath: string }> {
  const snapshotRevision = crypto.randomUUID();
  const dashboardId = await seedDashboard({
    admin: options.admin,
    workspaceId: options.workspaceId,
    ownerEmail: options.ownerEmail,
    name: "Private snapshot e2e dashboard",
    isRestricted: true,
    snapshotRevision,
    visibility: "workspace",
  });
  const objectPath = `dashboards/${dashboardId}/revisions/${snapshotRevision}/datasets/${crypto.randomUUID()}.parquet`;
  const { error } = await options.admin.storage
    .from(PRIVATE_BUCKET)
    .upload(objectPath, new Blob([new Uint8Array([1, 2, 3])]), {
      contentType: "application/vnd.apache.parquet",
    });
  expect(error).toBeNull();
  return { dashboardId, objectPath };
}

async function _assertPrivateSnapshotAccess(
  options: Readonly<{
    admin: AdminClient;
    objectPath: string;
    request: APIRequestContext;
    viewerCredentials: Readonly<{ email: string; password: string }>;
  }>,
): Promise<void> {
  // Public URLs bypass object RLS when a bucket is marked public.
  const { data: publicUrlData } = options.admin.storage
    .from(PRIVATE_BUCKET)
    .getPublicUrl(options.objectPath);
  const publicResponse = await options.request.get(publicUrlData.publicUrl);
  expect(publicResponse.ok()).toBe(false);
  // Authenticated downloads exercise the no-share object RLS policy.
  const viewerClient = await createE2ESupabaseViewerClient(
    options.viewerCredentials,
  );
  const { data, error } = await viewerClient.storage
    .from(PRIVATE_BUCKET)
    .download(options.objectPath);
  expect(data).toBeNull();
  expect(error).not.toBeNull();
}

async function _deletePrivateSnapshot(
  options: Readonly<{
    admin: AdminClient;
    dashboardId: string | undefined;
    objectPath: string | undefined;
  }>,
): Promise<void> {
  if (options.objectPath !== undefined) {
    await options.admin.storage
      .from(PRIVATE_BUCKET)
      .remove([options.objectPath]);
  }
  if (options.dashboardId !== undefined) {
    await deleteDashboardsByIds({
      admin: options.admin,
      dashboardIds: [options.dashboardId],
    });
  }
}

/**
 * The pgTAP suite covers the policies on storage.objects. It cannot cover the
 * bucket's own public flag, which bypasses those policies for reads. This test
 * goes through the real HTTP storage API instead.
 */
test.describe("published-private bucket", () => {
  test("private snapshots deny public and unshared member reads", async ({
    request,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { admin, workspaceId } = e2eViewerMembership;
    const { primaryUser, secondaryUser } = e2eWorkerDb;
    let dashboardId: string | undefined;
    let objectPath: string | undefined;
    try {
      const snapshot = await _uploadPrivateSnapshot({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
      });
      ({ dashboardId, objectPath } = snapshot);
      await _assertPrivateSnapshotAccess({
        admin,
        request,
        objectPath,
        viewerCredentials: {
          email: secondaryUser.email,
          password: secondaryUser.password,
        },
      });
    } finally {
      await _deletePrivateSnapshot({ admin, dashboardId, objectPath });
    }
  });
});
