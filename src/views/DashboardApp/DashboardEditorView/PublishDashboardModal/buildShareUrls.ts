import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

/**
 * The dashboardId-based URL is always valid for any published dashboard.
 * The vanity URL is only valid when the dashboard has been published with
 * a slug. We return both so the publish modal can let the user pick which
 * to copy / QR-encode.
 */
export type ShareUrls = {
  canonical: string;
  vanity: string | undefined;
};

function _origin(): string {
  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }
  return "";
}

export function buildShareUrls(args: {
  workspaceSlug: string;
  dashboardId: DashboardId;
  slug: string | undefined;
}): ShareUrls {
  const base = _origin().replace(/\/$/, "");
  return {
    canonical: `${base}/public/dashboards/${args.workspaceSlug}/${args.dashboardId}`,
    vanity:
      args.slug ? `${base}/d/${args.workspaceSlug}/${args.slug}` : undefined,
  };
}
