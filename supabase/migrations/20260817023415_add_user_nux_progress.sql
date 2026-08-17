-- Onboarding tutorial progress, one row per user per tutorial.
-- See supabase/schemas/00.enum.nux_status.sql and 01.user_nux_progress.sql.

create type "public"."nux_status" as enum ('not_started', 'in_progress', 'completed', 'dismissed');

create table "public"."user_nux_progress" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "user_id" uuid not null default auth.uid(),
    "tutorial_key" text not null default 'first_dashboard'::text,
    "status" public.nux_status not null default 'not_started'::public.nux_status,
    "completed_milestones" text[] not null default '{}'::text[]
      );

alter table "public"."user_nux_progress" enable row level security;

CREATE INDEX idx_user_nux_progress__user_id ON public.user_nux_progress USING btree (user_id);

CREATE UNIQUE INDEX user_nux_progress__unique_user_tutorial ON public.user_nux_progress USING btree (user_id, tutorial_key);

CREATE UNIQUE INDEX user_nux_progress_pkey ON public.user_nux_progress USING btree (id);

alter table "public"."user_nux_progress" add constraint "user_nux_progress_pkey" PRIMARY KEY using index "user_nux_progress_pkey";

alter table "public"."user_nux_progress" add constraint "user_nux_progress__unique_user_tutorial" UNIQUE using index "user_nux_progress__unique_user_tutorial";

alter table "public"."user_nux_progress" add constraint "user_nux_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_nux_progress" validate constraint "user_nux_progress_user_id_fkey";

-- RLS decides which rows; these decide whether the caller may touch the table
-- at all. PostgREST refuses the request without them.
grant select, insert, update on table "public"."user_nux_progress" to "authenticated";

-- Matches every peer table. service_role bypasses RLS regardless.
grant all on table "public"."user_nux_progress" to "service_role";

grant references on table "public"."user_nux_progress" to "anon";

grant trigger on table "public"."user_nux_progress" to "anon";

grant truncate on table "public"."user_nux_progress" to "anon";

grant references on table "public"."user_nux_progress" to "authenticated";

grant trigger on table "public"."user_nux_progress" to "authenticated";

grant truncate on table "public"."user_nux_progress" to "authenticated";

grant references on table "public"."user_nux_progress" to "service_role";

grant trigger on table "public"."user_nux_progress" to "service_role";

grant truncate on table "public"."user_nux_progress" to "service_role";

CREATE TRIGGER tr_user_nux_progress__set_updated_at BEFORE UPDATE ON public.user_nux_progress FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

create policy "
  User can INSERT user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "
  User can SELECT user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "
  User can UPDATE user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));
