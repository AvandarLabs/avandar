import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { bestEffortRevokePolarSubscriptionForWorkspace } from "./helpers/polarSandbox";
import { seedCanceledSubscriptionForWorkspace } from "./helpers/seedCanceledSubscriptionForWorkspace";
import {
  expectNativeFreeSubscription,
  expectPaidPolarSubscription,
} from "./helpers/subscriptionAssertions";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { syncPaidSubscriptionForE2EHybrid } from "./helpers/syncPaidSubscriptionForE2EHybrid";
import { LONG_WAIT } from "./helpers/timeouts";
import {
  beginPolarCheckoutWait,
  createWorkspaceViaNavbar,
  finishHybridPolarPaidCheckout,
  getBillingPlanModal,
  selectPlanFromBillingModal,
  selectPlanFromSettingsBilling,
} from "./helpers/workspaceBillingFlow";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";

const FREE_PLAN_HEADING = "Avandar Free";
const STARTER_PLAN_HEADING = "Avandar Starter";
const STARTER_FEATURE_PLAN_TYPE = "basic";
const CHANGE_PLAN_MODAL_PATTERN = /Changing plan to|Upgrading plan to/i;

test.describe("workspace billing", () => {
  test("creates a native free subscription from the billing modal", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);

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
        planHeading: FREE_PLAN_HEADING,
      });

      await createFreeResponsePromise;

      await expect(page.getByText("You're on the Free plan")).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(getBillingPlanModal(page)).toBeHidden();

      const admin = createSupabaseAdminClient();
      await expectNativeFreeSubscription({
        supabaseAdminClient: admin,
        workspaceSlug,
      });
    } finally {
      try {
        const admin = createSupabaseAdminClient();
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-billing free cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });

  test("completes Polar checkout for a new paid workspace", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);

      await createWorkspaceViaNavbar({
        page,
        workspaceName,
        workspaceSlug,
      });

      await expect(getBillingPlanModal(page)).toBeVisible({
        timeout: LONG_WAIT,
      });

      const polarWait = beginPolarCheckoutWait(page);

      await selectPlanFromBillingModal({
        page,
        planHeading: STARTER_PLAN_HEADING,
      });

      const checkoutParams = await finishHybridPolarPaidCheckout({
        page,
        ...polarWait,
      });

      const admin = createSupabaseAdminClient();
      await syncPaidSubscriptionForE2EHybrid({
        supabaseAdminClient: admin,
        workspaceId: checkoutParams.workspaceId,
        userId: checkoutParams.userId,
        polarProductId: checkoutParams.productId,
        featurePlanType: STARTER_FEATURE_PLAN_TYPE,
      });

      await expectPaidPolarSubscription({
        supabaseAdminClient: admin,
        workspaceSlug,
        expectedFeaturePlanType: STARTER_FEATURE_PLAN_TYPE,
      });
    } finally {
      try {
        const admin = createSupabaseAdminClient();
        await bestEffortRevokePolarSubscriptionForWorkspace({
          supabaseAdminClient: admin,
          workspaceSlug,
        });
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-billing paid cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });

  test("upgrades a native free workspace to paid via Polar checkout", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);

      await createWorkspaceViaNavbar({
        page,
        workspaceName,
        workspaceSlug,
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
        planHeading: FREE_PLAN_HEADING,
      });

      await createFreeResponsePromise;

      await expect(page.getByText("You're on the Free plan")).toBeVisible({
        timeout: LONG_WAIT,
      });

      const admin = createSupabaseAdminClient();
      const nativeFreeId = await expectNativeFreeSubscription({
        supabaseAdminClient: admin,
        workspaceSlug,
      });

      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "Billing" }).click();

      const polarWait = beginPolarCheckoutWait(page);

      await selectPlanFromSettingsBilling({
        page,
        planHeading: STARTER_PLAN_HEADING,
      });

      const checkoutParams = await finishHybridPolarPaidCheckout({
        page,
        ...polarWait,
        expectMissingPolarSubscriptionId: true,
      });

      await syncPaidSubscriptionForE2EHybrid({
        supabaseAdminClient: admin,
        workspaceId: checkoutParams.workspaceId,
        userId: checkoutParams.userId,
        polarProductId: checkoutParams.productId,
        featurePlanType: STARTER_FEATURE_PLAN_TYPE,
      });

      await expectPaidPolarSubscription({
        supabaseAdminClient: admin,
        workspaceSlug,
        expectedFeaturePlanType: STARTER_FEATURE_PLAN_TYPE,
        expectedInternalId: nativeFreeId,
      });
    } finally {
      try {
        const admin = createSupabaseAdminClient();
        await bestEffortRevokePolarSubscriptionForWorkspace({
          supabaseAdminClient: admin,
          workspaceSlug,
        });
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-billing upgrade cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });

  test("opens change-plan modal when a paid workspace selects free", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);

      await createWorkspaceViaNavbar({
        page,
        workspaceName,
        workspaceSlug,
      });

      const createFreeResponsePromise = page.waitForResponse(
        (response) => {
          return (
            response.request().method() === "POST" &&
            response.url().includes("create-free")
          );
        },
        { timeout: LONG_WAIT },
      );

      await selectPlanFromBillingModal({
        page,
        planHeading: FREE_PLAN_HEADING,
      });

      await createFreeResponsePromise;

      await expect(page.getByText("You're on the Free plan")).toBeVisible({
        timeout: LONG_WAIT,
      });

      const admin = createSupabaseAdminClient();
      const polarWait = beginPolarCheckoutWait(page);

      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "Billing" }).click();

      await selectPlanFromSettingsBilling({
        page,
        planHeading: STARTER_PLAN_HEADING,
      });

      const checkoutParams = await finishHybridPolarPaidCheckout({
        page,
        ...polarWait,
        expectMissingPolarSubscriptionId: true,
      });

      await syncPaidSubscriptionForE2EHybrid({
        supabaseAdminClient: admin,
        workspaceId: checkoutParams.workspaceId,
        userId: checkoutParams.userId,
        polarProductId: checkoutParams.productId,
        featurePlanType: STARTER_FEATURE_PLAN_TYPE,
      });

      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "Billing" }).click();

      let createFreeCalled = false;
      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          request.url().includes("create-free")
        ) {
          createFreeCalled = true;
        }
      });

      await selectPlanFromSettingsBilling({
        page,
        planHeading: FREE_PLAN_HEADING,
      });

      await expect(
        page.getByRole("dialog").getByText(CHANGE_PLAN_MODAL_PATTERN),
      ).toBeVisible({
        timeout: LONG_WAIT,
      });
      expect(createFreeCalled).toBe(false);
    } finally {
      try {
        const admin = createSupabaseAdminClient();
        await bestEffortRevokePolarSubscriptionForWorkspace({
          supabaseAdminClient: admin,
          workspaceSlug,
        });
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-billing paid-to-free cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });

  test("converts a canceled paid subscription to native free", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);

      await createWorkspaceViaNavbar({
        page,
        workspaceName,
        workspaceSlug,
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
        planHeading: FREE_PLAN_HEADING,
      });

      await createFreeResponsePromise;

      const admin = createSupabaseAdminClient();
      const polarWait = beginPolarCheckoutWait(page);

      await page.goto(`/${workspaceSlug}/settings`);
      await page.getByRole("tab", { name: "Billing" }).click();

      await selectPlanFromSettingsBilling({
        page,
        planHeading: STARTER_PLAN_HEADING,
      });

      const checkoutParams = await finishHybridPolarPaidCheckout({
        page,
        ...polarWait,
        expectMissingPolarSubscriptionId: true,
      });

      await syncPaidSubscriptionForE2EHybrid({
        supabaseAdminClient: admin,
        workspaceId: checkoutParams.workspaceId,
        userId: checkoutParams.userId,
        polarProductId: checkoutParams.productId,
        featurePlanType: STARTER_FEATURE_PLAN_TYPE,
      });

      await seedCanceledSubscriptionForWorkspace({
        supabaseAdminClient: admin,
        workspaceSlug,
      });

      await page.goto(`/${workspaceSlug}`);

      await expect(getBillingPlanModal(page)).toBeVisible({
        timeout: LONG_WAIT,
      });

      const recreateFreeResponsePromise = page.waitForResponse(
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
        planHeading: FREE_PLAN_HEADING,
      });

      await recreateFreeResponsePromise;

      await expect(page.getByText("You're on the Free plan")).toBeVisible({
        timeout: LONG_WAIT,
      });

      await expectNativeFreeSubscription({
        supabaseAdminClient: admin,
        workspaceSlug,
      });
    } finally {
      try {
        const admin = createSupabaseAdminClient();
        await bestEffortRevokePolarSubscriptionForWorkspace({
          supabaseAdminClient: admin,
          workspaceSlug,
        });
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-billing canceled-to-free cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });
});
