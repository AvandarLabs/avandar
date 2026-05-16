import { test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";

test.describe("login", () => {
  test("logs in as the primary E2E test user", async ({
    page,
    e2eWorkerDb,
  }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
  });
});
