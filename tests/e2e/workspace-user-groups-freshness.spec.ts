import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteWorkspaceTagByName } from "./helpers/datasetSharingCleanup";
import { E2E_SECONDARY_MEMBER_DISPLAY_NAME } from "./helpers/datasetSharingFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { createWorkspaceTagViaSettings } from "./helpers/workspaceTagsFlow";
import type { Page } from "@playwright/test";

/**
 * `idb-keyval` defaults, plus the persister key from `queryPersister.ts`.
 */
const IDB_NAME = "keyval-store";
const IDB_STORE = "keyval";
const PERSISTED_CACHE_KEY = "avandar-react-query-cache";

/**
 * Waits until the persisted React Query cache in IndexedDB mentions
 * `queryFnName`, meaning the throttled persister has flushed that query's data
 * to disk and the next page load will restore it.
 */
async function _waitForPersistedQuery(options: {
  page: Page;
  queryFnName: string;
}): Promise<void> {
  const { page, queryFnName } = options;
  await expect
    .poll(
      () => {
        return page.evaluate(
          ([dbName, storeName, cacheKey]) => {
            return new Promise<string>((resolve, reject) => {
              const openRequest = indexedDB.open(dbName);
              openRequest.onerror = () => {
                return reject(openRequest.error);
              };
              openRequest.onsuccess = () => {
                const db = openRequest.result;
                if (!db.objectStoreNames.contains(storeName)) {
                  resolve("");
                  return;
                }
                const getRequest = db
                  .transaction(storeName, "readonly")
                  .objectStore(storeName)
                  .get(cacheKey);
                getRequest.onerror = () => {
                  return reject(getRequest.error);
                };
                getRequest.onsuccess = () => {
                  return resolve(
                    typeof getRequest.result === "string"
                      ? getRequest.result
                      : "",
                  );
                };
              };
            });
          },
          [IDB_NAME, IDB_STORE, PERSISTED_CACHE_KEY] as const,
        );
      },
      { timeout: MEDIUM_WAIT },
    )
    .toContain(queryFnName);
}

/**
 * The React Query cache is persisted to IndexedDB and restored on boot, and
 * `AvaQueryClient`'s default `staleTime` keeps a restored entry valid for its
 * whole window. A user-group list cached before a group exists is therefore
 * restored as "fresh" and, without an explicit refetch on mount, keeps hiding
 * that group for that entire window: the permission screens would let an admin
 * save a member's groups from a list that is missing entries.
 *
 * Two deliberate exceptions to the E2E rules in `docs/rules/e2e-testing.md`:
 *
 * - the mid-test `page.goto` is the behavior under test (a cold reload), which
 *   is that rule's documented exception; and
 * - the group is created by a second admin session in `freshBrowserPage`
 *   rather than by an admin DB write, so the creation still runs the app's real
 *   mutation path. That page is used only because its browser has its own
 *   IndexedDB, which leaves the page under test holding a pre-creation
 *   snapshot; it is not here for a large parse.
 */
test.describe("workspace user groups freshness", () => {
  test("a group created in another session shows up after a reload", async ({
    page,
    freshBrowserPage,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const groupName = "E2E Out Of Band Group";

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      // Cache (and persist) the user-group list while the group does not
      // exist yet.
      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "User groups" }).click();
      await expect(
        page.getByRole("button", { name: "New user group" }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await _waitForPersistedQuery({ page, queryFnName: "getUserGroups" });

      await signInWithEmailPassword(freshBrowserPage, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await createWorkspaceTagViaSettings({
        page: freshBrowserPage,
        workspaceSlug,
        tagName: groupName,
      });

      // A reload restores the pre-creation snapshot, so the group only appears
      // if the screens refetch on mount instead of trusting it.
      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "User groups" }).click();
      await expect(page.getByText(groupName)).toBeVisible({
        timeout: LONG_WAIT,
      });

      await page.getByRole("tab", { name: "Members" }).click();
      await page
        .getByRole("row")
        .filter({ hasText: E2E_SECONDARY_MEMBER_DISPLAY_NAME })
        .getByLabel("Edit permissions")
        .click();

      const drawer = page.locator(".mantine-Drawer-content");
      const groupsField = drawer.getByRole("combobox", { name: "User groups" });
      await expect(groupsField).toBeEnabled({ timeout: LONG_WAIT });
      await groupsField.click();
      await expect(page.getByRole("option", { name: groupName })).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
    } finally {
      await deleteWorkspaceTagByName({
        supabaseAdminClient: admin,
        workspaceId,
        tagName: groupName,
      });
    }
  });
});
