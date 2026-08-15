/**
 * Publication state of a dashboard.
 *
 *   draft     - not published. Visible only to people who can edit it.
 *   workspace - published to the workspace and served from
 *               /<workspaceSlug>/d/<slug>. Snapshots live in the
 *               `published-private` bucket.
 *   public    - served from /d/<slug>. Anonymous reads of its snapshots are
 *               allowed through RLS. Snapshots live in the private
 *               `published` bucket.
 *
 * `dashboards.is_public` is generated from this column for read-side
 * compatibility.
 */
create type public.dashboard_visibility as enum(
  'draft',
  'workspace',
  'public'
);
