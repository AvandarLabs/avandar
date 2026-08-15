import { Dashboard } from "$/models/Dashboard/Dashboard";

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

type Options = {
  workspaceSlug: string;
  dashboardId: Dashboard.Id;
  slug: string | undefined;
};

/** Builds canonical and optional vanity URLs for a published dashboard. */
export function buildShareUrls(args: Readonly<Options>): ShareUrls {
  const base = _origin().replace(/\/$/, "");
  return {
    canonical: `${base}/public/dashboards/${args.workspaceSlug}/${args.dashboardId}`,
    vanity: args.slug ? `${base}/d/${args.slug}` : undefined,
  };
}
