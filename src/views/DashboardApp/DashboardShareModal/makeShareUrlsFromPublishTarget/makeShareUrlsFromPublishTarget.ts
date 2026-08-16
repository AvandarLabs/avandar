import { Dashboard } from "$/models/Dashboard/Dashboard";
import type { PublishedVisibility } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

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
  /**
   * The audience the URLs are for, which is the publish TARGET while
   * editing.
   */
  visibility: PublishedVisibility;
};

/**
 * Builds the canonical and optional vanity URLs for a published dashboard.
 *
 * The two audiences have separate URL namespaces: a public dashboard resolves
 * at `/d/<slugOrId>` for a visitor with no workspace context, and a
 * workspace-only one at `/<workspaceSlug>/d/<slugOrId>`.
 *
 * `canonical` is what the QR affordance encodes. It points at those routes
 * rather than the legacy `/public/dashboards/...` path, which survives only as
 * a redirect for QR codes already in circulation.
 */
export function makeShareUrlsFromPublishTarget(
  args: Readonly<Options>,
): ShareUrls {
  const base = _origin().replace(/\/$/, "");
  const prefix =
    args.visibility === "public" ?
      `${base}/d`
    : `${base}/${args.workspaceSlug}/d`;
  return {
    canonical: `${prefix}/${args.dashboardId}`,
    vanity: args.slug ? `${prefix}/${args.slug}` : undefined,
  };
}
