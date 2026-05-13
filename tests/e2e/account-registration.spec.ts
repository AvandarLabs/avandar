import { expect, test } from "./fixtures/e2e.fixture";
import { cleanupTestUser } from "./helpers/cleanupTestUser";
import { LONG_WAIT } from "./helpers/timeouts";

function _isSelfRegistrationDisabled(): boolean {
  const raw = process.env.VITE_FEATURE_FLAGS ?? "";
  return raw
    .split(",")
    .map((flag) => {
      return flag.trim();
    })
    .includes("disable-self-registration");
}

test.describe("account registration", () => {
  test("creates a new account", async ({ page }) => {
    test.skip(
      _isSelfRegistrationDisabled(),
      "Self-registration is disabled (VITE_FEATURE_FLAGS includes disable-self-registration).",
    );

    const uniqueSuffix = Date.now();
    const email = `e2e-register-${uniqueSuffix}@avandarlabs.com`;
    const password = `E2e-register-pass-${uniqueSuffix}!`;

    try {
      await page.goto("/register");

      await page.getByLabel("Email").fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.getByRole("button", { name: "Register" }).click();

      await expect(page).not.toHaveURL(/\/register/, { timeout: LONG_WAIT });

      await expect(
        page.getByRole("heading", {
          name: /welcome to your first workspace/i,
        }),
      ).toBeVisible({ timeout: LONG_WAIT });
    } finally {
      await cleanupTestUser(email);
    }
  });
});
