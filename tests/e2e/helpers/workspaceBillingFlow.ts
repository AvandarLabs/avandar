import type { Frame, Page, Response } from "@playwright/test";

import { expect } from "@playwright/test";

import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./constants";
import { LONG_WAIT, SHORT_WAIT } from "./timeouts";

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

export type CheckoutUrlParams = {
  productId: string;
  userId: string;
  workspaceId: string;
};

/**
 * Parses workspace and product ids from a checkout-url API response.
 */
export function parseCheckoutUrlParams(
  checkoutResponse: Response,
): CheckoutUrlParams {
  const requestUrl = new URL(checkoutResponse.url());
  const pathSegments = requestUrl.pathname.split("/");
  const productId = pathSegments[pathSegments.length - 1] ?? "";
  const userId = requestUrl.searchParams.get("userId");
  const workspaceId = requestUrl.searchParams.get("workspaceId");

  if (!productId || !userId || !workspaceId) {
    throw new Error(
      "[e2e] checkout-url response is missing productId, userId, or workspaceId.",
    );
  }

  return { productId, userId, workspaceId };
}

/**
 * Asserts checkout-url succeeded and the browser redirected to Polar.
 */
export async function finishPolarCheckoutWait(options: {
  checkoutResponsePromise: Promise<Response>;
  navigationPromise: Promise<void>;
  expectMissingPolarSubscriptionId?: boolean;
}): Promise<Response> {
  const checkoutResponse = await options.checkoutResponsePromise;
  const requestUrl = new URL(checkoutResponse.url());

  if (options.expectMissingPolarSubscriptionId) {
    expect(requestUrl.searchParams.get("currentPolarSubscriptionId")).toBe(
      null,
    );
  }

  expect(checkoutResponse.ok()).toBe(true);

  await options.navigationPromise;

  return checkoutResponse;
}

const STRIPE_TEST_CARD = "4242424242424242";
const STRIPE_TEST_CVC = "123";

/**
 * Finds the iframe that contains the Stripe card fields.
 */
async function _findPaymentFrame(page: Page): Promise<Frame> {
  for (const frame of page.frames()) {
    const cardField = frame.getByRole("textbox", { name: /card number/i });
    if ((await cardField.count()) > 0) {
      return frame;
    }
  }

  throw new Error("Polar payment iframe is not ready yet.");
}

/**
 * Asserts the Polar hosted checkout page loaded with email and Stripe card UI.
 */
export async function assertPolarCheckoutPageReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(/polar\./i, { timeout: LONG_WAIT });
  await expect(page.getByRole("textbox", { name: /^email$/i })).toBeVisible({
    timeout: LONG_WAIT,
  });

  await expect(async () => {
    await _findPaymentFrame(page);
  }).toPass({ timeout: LONG_WAIT });
}

/**
 * Fills Stripe card and cardholder fields on Polar checkout
 * (no billing address).
 */
export async function fillPolarStripeCardFieldsOnly(page: Page): Promise<void> {
  let paymentFrame: Frame;
  await expect(async () => {
    paymentFrame = await _findPaymentFrame(page);
  }).toPass({ timeout: LONG_WAIT });

  await paymentFrame!
    .getByRole("textbox", { name: /card number/i })
    .pressSequentially(STRIPE_TEST_CARD, { delay: 30 });
  await paymentFrame!
    .getByRole("textbox", { name: /expiration/i })
    .pressSequentially("1234", { delay: 30 });
  await paymentFrame!
    .getByRole("textbox", { name: /security code|cvc/i })
    .pressSequentially(STRIPE_TEST_CVC, { delay: 30 });

  await page
    .getByRole("textbox", { name: /cardholder name/i })
    .fill("E2E Tester");
}

/**
 * Drives Polar's hosted paid checkout as far as the e2e can.
 *
 * ROADBLOCK: Polar sandbox billing address uses Radix comboboxes (country,
 * province/state) that Playwright cannot drive reliably. Geo defaults vary per
 * run (Country placeholder, Canada+Province only, or US street fields with
 * Canada still selected). Hidden `<select>` updates desync the visible UI;
 * listbox and keyboard selection often looks successful mid-interaction but
 * reverts to `["Province","Canada"]` before Subscribe, so the checkout never
 * reaches `success=true`. Stripe card fields in the nested iframe *do* automate
 * well; billing address does not (yet).
 *
 * Until that is solved, this helper only asserts our checkout-url redirect and
 * Polar/Stripe form load (plus card fields). Callers simulate the paid DB row
 * via `upsertPaidSubscriptionForE2E`.
 */
export async function finishPolarPaidCheckoutForE2E(options: {
  page: Page;
  checkoutResponsePromise: Promise<Response>;
  navigationPromise: Promise<void>;
  expectMissingPolarSubscriptionId?: boolean;
}): Promise<CheckoutUrlParams> {
  const checkoutResponse = await finishPolarCheckoutWait({
    checkoutResponsePromise: options.checkoutResponsePromise,
    navigationPromise: options.navigationPromise,
    expectMissingPolarSubscriptionId: options.expectMissingPolarSubscriptionId,
  });

  await assertPolarCheckoutPageReady(options.page);
  await fillPolarStripeCardFieldsOnly(options.page);

  return parseCheckoutUrlParams(checkoutResponse);
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
