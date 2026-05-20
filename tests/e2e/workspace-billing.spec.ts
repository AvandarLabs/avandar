import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { expectNativeFreeSubscription } from "./helpers/subscriptionAssertions";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import {
  beginPolarCheckoutWait,
  createWorkspaceViaNavbar,
  finishPolarCheckoutWait,
  getBillingPlanModal,
  selectPlanFromBillingModal,
  selectPlanFromSettingsBilling,
} from "./helpers/workspaceBillingFlow";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";

const FREE_PLAN_HEADING = "Avandar Free";
const STARTER_PLAN_HEADING = "Avandar Starter";

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

  test("redirects new workspaces to Polar checkout for a paid plan", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(120_000);
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

      await finishPolarCheckoutWait(polarWait);
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
          `[e2e] workspace-billing paid cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });

  test("redirects native free workspaces to Polar checkout when upgrading", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(120_000);
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
      await expectNativeFreeSubscription({
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

      await finishPolarCheckoutWait({
        ...polarWait,
        expectMissingPolarSubscriptionId: true,
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
          `[e2e] workspace-billing upgrade cleanup (${workspaceSlug}): ` +
            `${message}`,
        );
      }
    }
  });
});
