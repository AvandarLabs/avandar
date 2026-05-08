import { test } from "./fixtures/e2eTestWorkspace.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { E2E_TEST_USER } from "./helpers/constants";

test.describe("login", () => {
  test("logs in as the primary seeded test user", async ({ page }) => {
    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });
  });
});
