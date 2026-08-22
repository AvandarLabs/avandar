import type { Dashboard } from "$/models/Dashboard/Dashboard";

import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy canonical dashboard URL. Deprecated; do not add behavior here.
 *
 * This path supports QR codes printed on flyers and in reports, which cannot
 * be edited after distribution. It must not be renamed or made conditional.
 * Delete it once those codes are out of circulation.
 *
 * The redirect forwards to `/d/<dashboardId>` without a lookup. That route
 * resolves the dashboard, decides access, and forwards workspace-only rows to
 * `/<workspaceSlug>/d/<slug>`. This route discards `workspaceSlug`; `/d/<id>`
 * recovers the workspace from the row when needed.
 */
export const Route = createFileRoute(
  "/public/dashboards/$workspaceSlug/$dashboardId",
)({
  loader: ({ params }): never => {
    throw redirect({
      to: "/d/$slugOrId",
      params: { slugOrId: params.dashboardId as Dashboard.Id },
      replace: true,
    });
  },
});
