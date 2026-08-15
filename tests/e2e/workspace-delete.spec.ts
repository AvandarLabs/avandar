import { unknownToString } from "@avandar/utils";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./helpers/constants";
import { dismissBillingModalIfVisible } from "./helpers/dismissBillingModal";
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
import { openWorkspaceSettingsTab } from "./helpers/workspaceTagsFlow";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";
import { ensureWorkspaceSubscriptionForE2E } from "./setup/ensureWorkspaceSubscriptionForE2E";
import type { Page, Response } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Throws with HTTP status and body when `workspaces/validate-slug` does not
 * succeed, so timeouts vs 4xx/5xx are distinguishable in CI logs.
 */
async function _assertSlugResponseOk(response: Response): Promise<void> {
  if (response.ok()) {
    return;
  }

  const bodySnippet = await (async () => {
    try {
      const text = await response.text();
      return text.length > 800 ? `${text.slice(0, 800)}…` : text;
    } catch {
      return "(could not read response body)";
    }
  })();

  throw new Error(
    `workspaces/validate-slug request failed: HTTP ${response.status()} ${response.statusText()}. Response body: ${bodySnippet}`,
  );
}

type FillCreateWorkspaceDialogOptions = {
  page: Page;
  workspaceName: string;
  workspaceSlug: string;
};

/**
 * Fills the create-workspace dialog and waits until the new workspace URL
 * is showing.
 */
async function _fillAndSubmitCreateWorkspaceDialog(
  options: Readonly<FillCreateWorkspaceDialogOptions>,
): Promise<void> {
  const { page, workspaceName, workspaceSlug } = options;
  const dialog = page.getByRole("dialog");
  const slugValidationResponsePromise = page.waitForResponse(
    (response) => {
      return (
        response.request().method() === "POST" &&
        response.url().includes("validate-slug")
      );
    },
    { timeout: LONG_WAIT },
  );

  await dialog.getByLabel("Workspace Name").fill(workspaceName);
  await expect(dialog.getByLabel("Workspace ID")).toHaveValue(workspaceSlug, {
    timeout: SHORT_WAIT,
  });
  await _assertSlugResponseOk(await slugValidationResponsePromise);

  await dialog.getByLabel("Full Name").fill("E2E Tester");
  await dialog.getByLabel("Display Name").fill("E2E Tester");
  await expect(dialog.getByRole("button", { name: "Submit" })).toBeEnabled({
    timeout: LONG_WAIT,
  });
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
    timeout: LONG_WAIT,
  });
}

type CreateDeletableWorkspaceOptions = {
  page: Page;
  workspaceName: string;
  workspaceSlug: string;
  polarCustomerEmail: string;
};

/**
 * Creates a workspace through the UI and seeds a subscription so Settings
 * and the danger zone can render.
 */
async function _createDeletableWorkspaceViaUi(
  options: Readonly<CreateDeletableWorkspaceOptions>,
): Promise<void> {
  const { page, workspaceName, workspaceSlug, polarCustomerEmail } = options;

  await page
    .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
    .click();
  await page.getByRole("menuitem", { name: "Create Workspace" }).click();
  await _fillAndSubmitCreateWorkspaceDialog({
    page,
    workspaceName,
    workspaceSlug,
  });

  // The UI create flow does not leave a valid subscription in E2E, so
  // Settings would redirect to /invalid-workspace (NO_SUBSCRIPTION) and the
  // danger zone would never render. Seed native-free the same way the worker
  // fixture does for the shared workspace.
  await ensureWorkspaceSubscriptionForE2E({
    workspaceSlug,
    polarCustomerEmail,
  });
  await dismissBillingModalIfVisible(page);
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

  await confirmButton.click();
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
  // NOTE: the guard throws `AvaHTTPError(FORBIDDEN)`, but the response
  // status is 401, not 403, because `authMiddleware` currently collapses
  // every handler error to 401 (see
  // https://github.com/AvandarLabs/avandar/issues/267). We assert the
  // current behavior plus the owner-only message so this still proves the
  // guard fired; tighten to 403 once #267 is fixed.
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

    // 401 (not 403) is the current behavior - see issue #267. The message
    // proves the owner-only guard is what rejected the call, not a generic
    // auth failure.
    expect(response.status).toBe(401);
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
        polarCustomerEmail: e2eWorkerDb.primaryUser.email,
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
