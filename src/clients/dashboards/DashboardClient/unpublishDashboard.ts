import { assertIsDefined } from "@avandar/utils";
import {
  createTransitionClaim,
  finishCleanupTransition,
  recoverTransition,
} from "@/clients/dashboards/DashboardClient/dashboardSnapshotTransitions";
import type { DashboardMutationContext } from "@/clients/dashboards/DashboardClient/DashboardClient.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/** Returns a dashboard to draft and empties every snapshot bucket. */
export async function unpublishDashboard(
  options: Readonly<{
    context: DashboardMutationContext;
    dashboardId: Dashboard.Id;
  }>,
): Promise<Dashboard.T> {
  const logger = options.context.clientLogger.appendName("unpublishDashboard");
  logger.log("Unpublishing dashboard", { dashboardId: options.dashboardId });
  const initialDashboard = await options.context.getDashboardById(
    options.dashboardId,
  );
  assertIsDefined(initialDashboard, { name: "dashboard" });
  if (initialDashboard.snapshotTransitionKind === "unpublish") {
    const resumedDashboard = await finishCleanupTransition({
      context: options.context,
      dashboard: initialDashboard,
    });
    assertIsDefined(resumedDashboard, { name: "dashboard" });
    return resumedDashboard;
  }
  const dashboardForClaim =
    initialDashboard.snapshotTransitionKind === undefined ?
      initialDashboard
    : await recoverTransition({
        context: options.context,
        dashboard: initialDashboard,
        logger,
      });
  assertIsDefined(dashboardForClaim, { name: "dashboard" });
  const claimedDashboard = await createTransitionClaim({
    context: options.context,
    dashboard: dashboardForClaim,
    kind: "unpublish",
  });
  const updatedDashboard = await finishCleanupTransition({
    context: options.context,
    dashboard: claimedDashboard,
  });
  assertIsDefined(updatedDashboard, { name: "dashboard" });
  return updatedDashboard;
}

/** Deletes a dashboard row after emptying every snapshot bucket it owns. */
export async function fullDeleteDashboard(
  options: Readonly<{
    context: DashboardMutationContext;
    dashboardId: Dashboard.Id;
  }>,
): Promise<void> {
  const logger = options.context.clientLogger.appendName("fullDelete");
  logger.log("Deleting dashboard", { id: options.dashboardId });
  const initialDashboard = await options.context.getDashboardById(
    options.dashboardId,
  );
  assertIsDefined(initialDashboard, { name: "dashboard" });
  if (initialDashboard.snapshotTransitionKind === "delete") {
    await finishCleanupTransition({
      context: options.context,
      dashboard: initialDashboard,
    });
    return;
  }
  const dashboardForClaim =
    initialDashboard.snapshotTransitionKind === undefined ?
      initialDashboard
    : await recoverTransition({
        context: options.context,
        dashboard: initialDashboard,
        logger,
      });
  if (dashboardForClaim === undefined) {
    return;
  }
  const claimedDashboard = await createTransitionClaim({
    context: options.context,
    dashboard: dashboardForClaim,
    kind: "delete",
  });
  await finishCleanupTransition({
    context: options.context,
    dashboard: claimedDashboard,
  });
}
