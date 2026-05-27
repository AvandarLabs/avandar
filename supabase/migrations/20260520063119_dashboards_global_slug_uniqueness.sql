-- Replace the per-workspace `(workspace_id, slug)` unique constraint with a
-- partial unique index on `slug` for `is_public = true` dashboards only.
-- Vanity URLs live at `/d/<slug>` (no workspace component), so the slug must
-- be globally unique among public dashboards. Non-public dashboards keep no
-- slug constraint; the publish flow enforces availability before flipping
-- `is_public`.

alter table "public"."dashboards" drop constraint "dashboards__workspace_id_slug";

drop index if exists "public"."dashboards__workspace_id_slug";

create unique index dashboards__slug_unique_when_public
  on public.dashboards using btree (slug)
  where ((is_public = true) and (slug is not null));
