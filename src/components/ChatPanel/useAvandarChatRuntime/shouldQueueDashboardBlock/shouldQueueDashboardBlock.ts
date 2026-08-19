/**
 * Returns whether an `addDashboardBlock` result should be queued onto the
 * current dashboard editor. Untargeted blocks must not buffer for the next
 * dashboard the user opens.
 */
export function shouldQueueDashboardBlock(
  dashboardId: string | undefined,
): boolean {
  return dashboardId !== undefined && dashboardId.length > 0;
}
