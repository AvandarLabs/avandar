import { expect, test } from "@playwright/test";
import { signInWithEmailPassword } from "./helpers/auth";
import { E2E_SEEDED_WORKSPACE_SLUG, E2E_TEST_USER } from "./helpers/constants";

test.describe("login", () => {
  test("logs in as the primary seeded test user", async ({ page }) => {
    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await expect(page).toHaveURL(new RegExp(`/${E2E_SEEDED_WORKSPACE_SLUG}`), {
      timeout: 60_000,
    });
  });
});
