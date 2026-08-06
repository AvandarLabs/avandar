import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { expectWorkspaceAppAccessDenied } from "./helpers/workspaceAppRouteExpectations";

test.describe("workspace settings access (non-settings admin)", () => {
  test("Global Viewer is redirected from settings to access denied", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    void e2eViewerMembership;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await expectWorkspaceAppAccessDenied(page, {
      workspaceSlug: e2eWorkerDb.workspaceSlug,
      appPath: "/settings",
    });

    await expect(page.getByRole("tab", { name: "General" })).toHaveCount(0);
  });
});
