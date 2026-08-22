import type { Page } from "@playwright/test";

import { unknownToString } from "@avandar/utils";

import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  createE2ESupabaseViewerClient,
  getSupabaseAnonKeyFromEnv,
  getSupabaseUrlFromEnv,
} from "./helpers/supabase";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
  WORKSPACES_STORAGE_BUCKET,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import {
  createWorkspaceViaNavbar,
  getBillingPlanModal,
  selectPlanFromBillingModal,
} from "./helpers/workspaceBillingFlow";
import { openWorkspaceSettingsTab } from "./helpers/workspaceTagsFlow";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type CreateDeletableWorkspaceOptions = {
  page: Page;
  workspaceName: string;
  workspaceSlug: string;
};

/**
 * Creates a workspace through the UI and selects Avandar Free so Settings
 * and the danger zone can render. New workspaces open the plan modal; the
 * Free path is the same as `workspace-billing`'s native-free spec.
 */
async function _createDeletableWorkspaceViaUi(
  options: Readonly<CreateDeletableWorkspaceOptions>,
): Promise<void> {
  const { page, workspaceName, workspaceSlug } = options;

  await createWorkspaceViaNavbar({
    page,
    workspaceName,
    workspaceSlug,
  });

  await expect(getBillingPlanModal(page)).toBeVisible({
    timeout: LONG_WAIT,
  });
  const createFreeResponsePromise = page.waitForResponse(
    (response) => {
      return (
        response.request().method() === "POST" &&
        response.url().includes("create-free") &&
        response.ok()
      );
    },
    { timeout: LONG_WAIT },
  );
  await selectPlanFromBillingModal({
    page,
    planHeading: "Avandar Free",
  });
  await createFreeResponsePromise;
  await expect(getBillingPlanModal(page)).toBeHidden({ timeout: LONG_WAIT });
}

type SeedNestedWorkspaceStorageOptions = {
  admin: AdminClient;
  workspaceSlug: string;
};

/**
 * Uploads top-level and nested objects under the workspace prefix so
 * deletion must walk storage recursively.
 *
 * @returns The workspace id used as the storage prefix.
 */
async function _seedNestedWorkspaceStorage(
  options: Readonly<SeedNestedWorkspaceStorageOptions>,
): Promise<string> {
  const { admin, workspaceSlug } = options;
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient: admin,
    slug: workspaceSlug,
  });
  const seededObjectPaths = [
    `${workspaceId}/root-a.txt`,
    `${workspaceId}/root-b.txt`,
    `${workspaceId}/datasets/nested.txt`,
  ];
  await Promise.all(
    seededObjectPaths.map(async (objectPath) => {
      const { error: uploadError } = await admin.storage
        .from(WORKSPACES_STORAGE_BUCKET)
        .upload(objectPath, new Blob(["e2e"], { type: "text/plain" }), {
          upsert: true,
        });
      expect(uploadError, `seed upload ${objectPath}`).toBeNull();
    }),
  );
  return workspaceId;
}

/**
 * Confirms workspace deletion in the danger-zone dialog, including the
 * whitespace-trimmed name match.
 */
async function _deleteWorkspaceViaDangerZone(options: {
  page: Page;
  workspaceName: string;
}): Promise<void> {
  const { page, workspaceName } = options;
  await page.getByRole("button", { name: "Delete workspace" }).click();

  const deleteDialog = page.getByRole("dialog");
  const confirmInput = deleteDialog.getByLabel(
    "Type the workspace name to confirm",
  );
  const confirmButton = deleteDialog.getByRole("button", {
    name: "Delete workspace",
  });

  // Wrong name keeps the button disabled.
  await confirmInput.fill("not the name");
  await expect(confirmButton).toBeDisabled();

  // Surrounding whitespace is trimmed, so the exact name still enables it.
  await confirmInput.fill(`  ${workspaceName}  `);
  await expect(confirmButton).toBeEnabled();

  const deleteResponsePromise = page.waitForResponse(
    (response) => {
      return (
        response.request().method() === "POST" &&
        response.url().includes("/delete")
      );
    },
    { timeout: LONG_WAIT },
  );
  await confirmButton.click();
  const deleteResponse = await deleteResponsePromise;
  expect(
    deleteResponse.ok(),
    `workspace delete failed: HTTP ${deleteResponse.status()} ${await deleteResponse.text()}`,
  ).toBe(true);
}

type AssertWorkspaceAndStoragePurgedOptions = {
  admin: AdminClient;
  workspaceSlug: string;
  workspaceId: string;
};

/**
 * Asserts the workspace row is gone and every seeded storage prefix is
 * empty, including nested folders.
 */
async function _assertWorkspaceAndStoragePurged(
  options: Readonly<AssertWorkspaceAndStoragePurgedOptions>,
): Promise<void> {
  const { admin, workspaceSlug, workspaceId } = options;
  const { data: workspaceRow } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle();
  expect(workspaceRow).toBeNull();

  const countObjectsUnder = async (prefix: string): Promise<number> => {
    const { data } = await admin.storage
      .from(WORKSPACES_STORAGE_BUCKET)
      .list(prefix, { limit: 1000 });
    return data?.length ?? 0;
  };
  await expect
    .poll(
      () => {
        return countObjectsUnder(workspaceId);
      },
      { timeout: SHORT_WAIT },
    )
    .toBe(0);
  await expect
    .poll(
      () => {
        return countObjectsUnder(`${workspaceId}/datasets`);
      },
      { timeout: SHORT_WAIT },
    )
    .toBe(0);
}

type CleanupOwnedWorkspaceOptions = {
  workspaceSlug: string;
  ownerEmail: string;
};

/**
 * Best-effort cleanup when the test failed before deletion finished.
 */
async function _cleanupOwnedWorkspaceIfPresent(
  options: Readonly<CleanupOwnedWorkspaceOptions>,
): Promise<void> {
  const { workspaceSlug, ownerEmail } = options;
  try {
    const admin = createSupabaseAdminClient();
    await deleteUserOwnedWorkspaceTreeBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
      ownerEmail,
    });
  } catch (error) {
    console.warn(
      `[e2e] workspace-delete cleanup (${workspaceSlug}): ${unknownToString(error)}`,
    );
  }
}

test.describe("workspace deletion", () => {
  // The delete endpoint's owner-only guard lives on the server: a member who
  // is not the owner never sees the delete UI, so the only way to exercise it
  // is to call the endpoint directly as a non-owner member. The Global Viewer
  // fixture makes the secondary user a member (so RLS lets them read the
  // workspace row and the owner check is what rejects them, not RLS).
  //
  // The guard throws `AvaHTTPError(FORBIDDEN)` and the response now carries
  // that status: `authMiddleware` hands the error itself to `responseError`
  // instead of stringifying it first, so an `AvaHTTPError`'s own code
  // survives (issue #267).
  test("rejects a non-owner member", async ({
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const viewerClient = await createE2ESupabaseViewerClient({
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
    });
    const {
      data: { session },
    } = await viewerClient.auth.getSession();
    expect(session, "viewer session should exist after sign-in").not.toBeNull();

    const response = await fetch(
      `${getSupabaseUrlFromEnv()}/functions/v1/workspaces/${e2eViewerMembership.workspaceId}/delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: getSupabaseAnonKeyFromEnv(),
          "Content-Type": "application/json",
        },
        // The MiniServer parses a JSON body on every POST, so an empty body
        // makes it throw before the owner check runs. Mirror what the app's
        // APIClient.post sends (an empty object) for a body-less route.
        body: JSON.stringify({}),
      },
    );

    // 403, not 401: the message proves the owner-only guard is what rejected
    // the call, and the status proves the guard's own code reached the client
    // rather than being collapsed into a generic auth failure.
    expect(response.status).toBe(403);
    const responseBody = (await response.json()) as { error?: string };
    expect(responseBody.error).toContain(
      "Only the workspace owner can delete a workspace",
    );

    // The workspace must still exist after the rejected call.
    const admin = createSupabaseAdminClient();
    const { data: workspaceRow } = await admin
      .from("workspaces")
      .select("id")
      .eq("id", e2eViewerMembership.workspaceId)
      .maybeSingle();
    expect(workspaceRow?.id).toBe(e2eViewerMembership.workspaceId);
  });

  // Owner path through the UI: create a workspace, seed a nested storage
  // tree, then delete it via the danger zone. Covers exact-name confirmation
  // (including trailing whitespace the input trims), the redirect home once
  // it is gone, and recursive storage purge of top-level files plus nested
  // prefixes.
  test("owner confirms the name, is redirected, and nested storage is purged", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    // Matches `slugify(workspaceName)` and stays within `SLUG_MAX_LENGTH` (20).
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _createDeletableWorkspaceViaUi({
        page,
        workspaceName,
        workspaceSlug,
      });

      const admin = createSupabaseAdminClient();
      const workspaceId = await _seedNestedWorkspaceStorage({
        admin,
        workspaceSlug,
      });

      await openWorkspaceSettingsTab({
        page,
        workspaceSlug,
        tabName: "General",
      });
      await _deleteWorkspaceViaDangerZone({ page, workspaceName });

      // Home ("/") may resolve to another workspace, so the stable
      // invariant is that we no longer sit on the deleted slug.
      await expect(page).not.toHaveURL(new RegExp(`/${workspaceSlug}(/|$)`), {
        timeout: LONG_WAIT,
      });

      await _assertWorkspaceAndStoragePurged({
        admin,
        workspaceSlug,
        workspaceId,
      });
    } finally {
      await _cleanupOwnedWorkspaceIfPresent({
        workspaceSlug,
        ownerEmail: e2eWorkerDb.primaryUser.email,
      });
    }
  });
});
