create type "public"."activity_events__kind" as enum ('comment_created', 'comment_edited', 'comment_deleted');

create type "public"."activity_events__source" as enum ('avandar', 'external');

create type "public"."comment_reactions__kind" as enum ('like', 'celebrate', 'support', 'love', 'insightful', 'funny');

create type "public"."comment_revisions__reason" as enum ('edit', 'delete');

  create table "public"."activity_events" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "individual_id" uuid,
    "kind" public.activity_events__kind not null,
    "source" public.activity_events__source not null default 'avandar'::public.activity_events__source,
    "actor_user_id" uuid,
    "comment_id" uuid,
    "occurred_at" timestamp with time zone not null default now(),
    "recorded_at" timestamp with time zone not null default now(),
    "payload" jsonb not null default '{}'::jsonb,
    "payload_version" smallint not null default 1
      );


alter table "public"."activity_events" enable row level security;


  create table "public"."comment_mentions" (
    "comment_id" uuid not null,
    "mentioned_user_id" uuid not null,
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_mentions" enable row level security;


  create table "public"."comment_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "comment_id" uuid not null,
    "user_id" uuid not null default auth.uid(),
    "workspace_id" uuid not null,
    "kind" public.comment_reactions__kind not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_reactions" enable row level security;


  create table "public"."comment_revisions" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "comment_id" uuid not null,
    "reason" public.comment_revisions__reason not null,
    "body" jsonb not null,
    "body_schema_version" smallint not null,
    "body_text" text not null,
    "revised_by_user_id" uuid,
    "created_at" timestamp with time zone not null default clock_timestamp()
      );


alter table "public"."comment_revisions" enable row level security;


  create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "individual_id" uuid,
    "author_user_id" uuid default auth.uid(),
    "body" jsonb,
    "body_schema_version" smallint not null default 1,
    "body_text" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "edited_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
      );


alter table "public"."comments" enable row level security;

CREATE UNIQUE INDEX activity_events_pkey ON public.activity_events USING btree (id);

CREATE UNIQUE INDEX comment_mentions_pkey ON public.comment_mentions USING btree (comment_id, mentioned_user_id);

CREATE UNIQUE INDEX comment_reactions__one_per_user ON public.comment_reactions USING btree (comment_id, user_id);

CREATE UNIQUE INDEX comment_reactions_pkey ON public.comment_reactions USING btree (id);

CREATE UNIQUE INDEX comment_revisions_pkey ON public.comment_revisions USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE INDEX idx_activity_events__actor_user_id ON public.activity_events USING btree (actor_user_id);

CREATE INDEX idx_activity_events__comment ON public.activity_events USING btree (comment_id);

CREATE INDEX idx_activity_events__individual_occurred ON public.activity_events USING btree (individual_id, occurred_at DESC, recorded_at DESC, id DESC);

CREATE INDEX idx_activity_events__workspace_id ON public.activity_events USING btree (workspace_id);

CREATE INDEX idx_comment_mentions__mentioned_user ON public.comment_mentions USING btree (mentioned_user_id);

CREATE INDEX idx_comment_mentions__workspace_id ON public.comment_mentions USING btree (workspace_id);

CREATE INDEX idx_comment_reactions__user_id ON public.comment_reactions USING btree (user_id);

CREATE INDEX idx_comment_reactions__workspace_id ON public.comment_reactions USING btree (workspace_id);

CREATE INDEX idx_comment_revisions__comment_created ON public.comment_revisions USING btree (comment_id, created_at);

CREATE INDEX idx_comment_revisions__revised_by_user_id ON public.comment_revisions USING btree (revised_by_user_id);

CREATE INDEX idx_comment_revisions__workspace_id ON public.comment_revisions USING btree (workspace_id);

CREATE INDEX idx_comments__author_user_id ON public.comments USING btree (author_user_id);

CREATE INDEX idx_comments__individual_created ON public.comments USING btree (individual_id, created_at);

CREATE INDEX idx_comments__workspace_id ON public.comments USING btree (workspace_id);

alter table "public"."activity_events" add constraint "activity_events_pkey" PRIMARY KEY using index "activity_events_pkey";

alter table "public"."comment_mentions" add constraint "comment_mentions_pkey" PRIMARY KEY using index "comment_mentions_pkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_pkey" PRIMARY KEY using index "comment_reactions_pkey";

alter table "public"."comment_revisions" add constraint "comment_revisions_pkey" PRIMARY KEY using index "comment_revisions_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."activity_events" add constraint "activity_events__exactly_one_subject" CHECK ((num_nonnulls(individual_id) = 1)) not valid;

alter table "public"."activity_events" validate constraint "activity_events__exactly_one_subject";

alter table "public"."activity_events" add constraint "activity_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."activity_events" validate constraint "activity_events_actor_user_id_fkey";

alter table "public"."activity_events" add constraint "activity_events_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."activity_events" validate constraint "activity_events_comment_id_fkey";

alter table "public"."activity_events" add constraint "activity_events_individual_id_fkey" FOREIGN KEY (individual_id) REFERENCES public.individuals(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."activity_events" validate constraint "activity_events_individual_id_fkey";

alter table "public"."activity_events" add constraint "activity_events_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."activity_events" validate constraint "activity_events_workspace_id_fkey";

alter table "public"."comment_mentions" add constraint "comment_mentions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_mentions" validate constraint "comment_mentions_comment_id_fkey";

alter table "public"."comment_mentions" add constraint "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY (mentioned_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_mentions" validate constraint "comment_mentions_mentioned_user_id_fkey";

alter table "public"."comment_mentions" add constraint "comment_mentions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_mentions" validate constraint "comment_mentions_workspace_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions__one_per_user" UNIQUE using index "comment_reactions__one_per_user";

alter table "public"."comment_reactions" add constraint "comment_reactions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_comment_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_user_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_workspace_id_fkey";

alter table "public"."comment_revisions" add constraint "comment_revisions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_revisions" validate constraint "comment_revisions_comment_id_fkey";

alter table "public"."comment_revisions" add constraint "comment_revisions_revised_by_user_id_fkey" FOREIGN KEY (revised_by_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."comment_revisions" validate constraint "comment_revisions_revised_by_user_id_fkey";

alter table "public"."comment_revisions" add constraint "comment_revisions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_revisions" validate constraint "comment_revisions_workspace_id_fkey";

alter table "public"."comments" add constraint "comments__body_present_unless_deleted" CHECK (((deleted_at IS NULL) = ((body IS NOT NULL) AND (body_text IS NOT NULL)))) not valid;

alter table "public"."comments" validate constraint "comments__body_present_unless_deleted";

alter table "public"."comments" add constraint "comments__body_size" CHECK ((pg_column_size(body) <= 262144)) not valid;

alter table "public"."comments" validate constraint "comments__body_size";

alter table "public"."comments" add constraint "comments__body_text_length" CHECK ((char_length(body_text) <= 10000)) not valid;

alter table "public"."comments" validate constraint "comments__body_text_length";

alter table "public"."comments" add constraint "comments__exactly_one_subject" CHECK ((num_nonnulls(individual_id) = 1)) not valid;

alter table "public"."comments" validate constraint "comments__exactly_one_subject";

alter table "public"."comments" add constraint "comments_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."comments" validate constraint "comments_author_user_id_fkey";

alter table "public"."comments" add constraint "comments_individual_id_fkey" FOREIGN KEY (individual_id) REFERENCES public.individuals(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_individual_id_fkey";

alter table "public"."comments" add constraint "comments_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.comments__record_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_kind public.activity_events__kind;
  v_revision_id uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := 'comment_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_kind := 'comment_deleted';
  elsif (new.body, new.body_text, new.body_schema_version)
    is distinct from (old.body, old.body_text, old.body_schema_version)
  then
    v_kind := 'comment_edited';
  else
    return null;
  end if;

  if v_kind <> 'comment_created' then
    select r.id
    into v_revision_id
    from public.comment_revisions r
    where r.comment_id = new.id
    order by r.created_at desc, r.id desc
    limit 1;
  end if;

  insert into public.activity_events (
    workspace_id, individual_id, kind, actor_user_id, comment_id, payload
  )
  values (
    new.workspace_id,
    new.individual_id,
    v_kind,
    auth.uid(),
    new.id,
    case
      when v_revision_id is null then '{}'::jsonb
      else jsonb_build_object('revision_id', v_revision_id)
    end
  );

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.comments__record_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.comment_revisions (
      workspace_id, comment_id, reason, body, body_schema_version, body_text, revised_by_user_id
    )
    values (
      old.workspace_id, old.id, 'delete', old.body, old.body_schema_version, old.body_text, auth.uid()
    );
    new.body := null;
    new.body_text := null;
  elsif (new.body, new.body_text, new.body_schema_version)
    is distinct from (old.body, old.body_text, old.body_schema_version)
  then
    insert into public.comment_revisions (
      workspace_id, comment_id, reason, body, body_schema_version, body_text, revised_by_user_id
    )
    values (
      old.workspace_id, old.id, 'edit', old.body, old.body_schema_version, old.body_text, auth.uid()
    );
    new.edited_at := now();
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.comments__sync_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  delete from public.comment_mentions m where m.comment_id = new.id;

  if new.body is null then
    return null;
  end if;

  insert into public.comment_mentions (comment_id, mentioned_user_id, workspace_id)
  select distinct new.id, mention.user_id, new.workspace_id
  from (
    select
      case
        when (mention_id #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (mention_id #>> '{}')::uuid
      end as user_id
    from jsonb_path_query(
      new.body,
      'lax $.** ? (@.type == "userMention").attrs.id'
    ) as mention_id
  ) as mention
  where mention.user_id is not null
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = new.workspace_id and wm.user_id = mention.user_id
    );

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.comments__validate_subject()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.edited_at := null;
    new.deleted_at := null;
  end if;

  if tg_op = 'UPDATE' then
    if new.individual_id is distinct from old.individual_id
      or new.workspace_id is distinct from old.workspace_id
      or (new.author_user_id is distinct from old.author_user_id and new.author_user_id is not null)
    then
      raise exception 'A comment cannot move to another case, workspace, or author'
        using errcode = '22023';
    end if;
    if old.deleted_at is not null and new.deleted_at is null then
      raise exception 'A deleted comment cannot be restored'
        using errcode = '22023';
    end if;
  end if;

  if new.individual_id is not null and not exists (
    select 1
    from public.individuals i
    where i.id = new.individual_id and i.workspace_id = new.workspace_id
  ) then
    raise exception 'The case belongs to a different workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

grant select on table "public"."activity_events" to "authenticated";

grant delete on table "public"."activity_events" to "service_role";

grant insert on table "public"."activity_events" to "service_role";

grant select on table "public"."activity_events" to "service_role";

grant update on table "public"."activity_events" to "service_role";

grant select on table "public"."comment_mentions" to "authenticated";

grant delete on table "public"."comment_mentions" to "service_role";

grant insert on table "public"."comment_mentions" to "service_role";

grant select on table "public"."comment_mentions" to "service_role";

grant update on table "public"."comment_mentions" to "service_role";

grant delete on table "public"."comment_reactions" to "authenticated";

grant insert on table "public"."comment_reactions" to "authenticated";

grant select on table "public"."comment_reactions" to "authenticated";

grant update on table "public"."comment_reactions" to "authenticated";

grant delete on table "public"."comment_reactions" to "service_role";

grant insert on table "public"."comment_reactions" to "service_role";

grant select on table "public"."comment_reactions" to "service_role";

grant update on table "public"."comment_reactions" to "service_role";

grant delete on table "public"."comment_revisions" to "service_role";

grant insert on table "public"."comment_revisions" to "service_role";

grant select on table "public"."comment_revisions" to "service_role";

grant update on table "public"."comment_revisions" to "service_role";

grant insert on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";


  create policy "User can SELECT activity_events in their workspace"
  on "public"."activity_events"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can SELECT comment_mentions in their workspace"
  on "public"."comment_mentions"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can DELETE their own reaction"
  on "public"."comment_reactions"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "User can INSERT their own reaction to a live comment"
  on "public"."comment_reactions"
  as permissive
  for insert
  to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.comments c
  WHERE ((c.id = comment_reactions.comment_id) AND (c.workspace_id = comment_reactions.workspace_id) AND (c.deleted_at IS NULL))))));



  create policy "User can SELECT comment_reactions in their workspace"
  on "public"."comment_reactions"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can UPDATE their own reaction to a live comment"
  on "public"."comment_reactions"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.comments c
  WHERE ((c.id = comment_reactions.comment_id) AND (c.workspace_id = comment_reactions.workspace_id) AND (c.deleted_at IS NULL))))));



  create policy "Author can UPDATE their own live comments"
  on "public"."comments"
  as permissive
  for update
  to authenticated
using (((author_user_id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))))
with check (((author_user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "User can INSERT their own comments in their workspace"
  on "public"."comments"
  as permissive
  for insert
  to authenticated
with check (((author_user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "User can SELECT comments in their workspace"
  on "public"."comments"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));


CREATE TRIGGER tr__comment_reactions__set_updated_at BEFORE UPDATE ON public.comment_reactions FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__comments__record_activity AFTER INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments__record_activity();

CREATE TRIGGER tr__comments__record_revision BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments__record_revision();

CREATE TRIGGER tr__comments__set_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__comments__sync_mentions AFTER INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments__sync_mentions();

CREATE TRIGGER tr__comments__validate_subject BEFORE INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments__validate_subject();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges (body) on table public.comments from public, anon, authenticated, service_role;
grant UPDATE (body) on table public.comments to "authenticated";
revoke all privileges (body_schema_version) on table public.comments from public, anon, authenticated, service_role;
grant UPDATE (body_schema_version) on table public.comments to "authenticated";
revoke all privileges (body_text) on table public.comments from public, anon, authenticated, service_role;
grant UPDATE (body_text) on table public.comments to "authenticated";
revoke all privileges (deleted_at) on table public.comments from public, anon, authenticated, service_role;
grant UPDATE (deleted_at) on table public.comments to "authenticated";
revoke all privileges on function public.comments__record_activity() from public, anon, authenticated, service_role;
revoke all privileges on function public.comments__record_revision() from public, anon, authenticated, service_role;
revoke all privileges on function public.comments__sync_mentions() from public, anon, authenticated, service_role;
revoke all privileges on function public.comments__validate_subject() from public, anon, authenticated, service_role;
