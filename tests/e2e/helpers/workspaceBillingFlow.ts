import { expect } from "@playwright/test";
import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./constants";
import { LONG_WAIT, SHORT_WAIT } from "./timeouts";
import type { Page, Response } from "@playwright/test";

type CreateWorkspaceViaNavbarOptions = {
  page: Page;
  workspaceName: string;
  workspaceSlug: string;
  displayName?: string;
};

/**
 * Opens the create-workspace dialog from the navbar and submits it.
 */
export async function createWorkspaceViaNavbar(
  options: CreateWorkspaceViaNavbarOptions,
): Promise<void> {
  const {
    page,
    workspaceName,
    workspaceSlug,
    displayName = "E2E Tester",
  } = options;

  await page
    .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
    .click();
  await page.getByRole("menuitem", { name: "Create Workspace" }).click();

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

  const slugValidationResponse = await slugValidationResponsePromise;
  expect(slugValidationResponse.ok()).toBe(true);

  await dialog.getByLabel("Full Name").fill(displayName);
  await dialog.getByLabel("Display Name").fill(displayName);

  await expect(dialog.getByRole("button", { name: "Submit" })).toBeEnabled({
    timeout: LONG_WAIT,
  });

  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
    timeout: LONG_WAIT,
  });
}

/**
 * Returns the billing plan-selection modal opened for new workspaces.
 */
export function getBillingPlanModal(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("dialog", { name: "Select your plan" });
}

/**
 * Clicks Select Plan on the plan card with the given heading text.
 */
export async function selectPlanFromBillingModal(options: {
  page: Page;
  planHeading: string;
}): Promise<void> {
  const { page, planHeading } = options;
  const modal = getBillingPlanModal(page);
  await expect(modal).toBeVisible({ timeout: LONG_WAIT });

  const planCard = modal
    .locator(".mantine-Card-root")
    .filter({ hasText: planHeading });
  await planCard.getByRole("button", { name: "Select Plan" }).click();
}

/**
 * Starts waiting for Polar checkout URL generation and redirect.
 * Call before clicking Select Plan on a paid card.
 */
export function beginPolarCheckoutWait(page: Page): {
  checkoutResponsePromise: Promise<Response>;
  navigationPromise: Promise<void>;
} {
  const checkoutResponsePromise = page.waitForResponse(
    (response) => {
      return (
        response.request().method() === "GET" &&
        response.url().includes("checkout-url") &&
        response.ok()
      );
    },
    { timeout: LONG_WAIT },
  );

  const navigationPromise = page.waitForURL(/polar\./i, {
    timeout: LONG_WAIT,
  });

  return { checkoutResponsePromise, navigationPromise };
}

/**
 * Asserts checkout-url succeeded and the browser redirected to Polar.
 */
export async function finishPolarCheckoutWait(options: {
  checkoutResponsePromise: Promise<Response>;
  navigationPromise: Promise<void>;
  expectMissingPolarSubscriptionId?: boolean;
}): Promise<void> {
  const checkoutResponse = await options.checkoutResponsePromise;
  const requestUrl = new URL(checkoutResponse.url());

  if (options.expectMissingPolarSubscriptionId) {
    expect(requestUrl.searchParams.get("currentPolarSubscriptionId")).toBe(
      null,
    );
  }

  expect(checkoutResponse.ok()).toBe(true);

  await options.navigationPromise;
}

/**
 * Clicks Select Plan on a settings billing page card.
 */
export async function selectPlanFromSettingsBilling(options: {
  page: Page;
  planHeading: string;
}): Promise<void> {
  const { page, planHeading } = options;
  const planCard = page
    .locator(".mantine-Card-root")
    .filter({ hasText: planHeading });
  await planCard.getByRole("button", { name: "Select Plan" }).click();
}
