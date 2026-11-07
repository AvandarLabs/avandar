create type "public"."gadget_type" as enum ('dashboard', 'dashboard_tile', 'dataset', 'map', 'concept', 'individual');

  create table "public"."comment_gadget_refs" (
    "id" uuid not null default gen_random_uuid(),
    "comment_id" uuid not null,
    "workspace_id" uuid not null,
    "gadget_type" public.gadget_type not null,
    "gadget_id" uuid not null,
    "sub_id" text,
    "display" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_gadget_refs" enable row level security;

CREATE UNIQUE INDEX comment_gadget_refs_pkey ON public.comment_gadget_refs USING btree (id);

CREATE INDEX idx_comment_gadget_refs__gadget ON public.comment_gadget_refs USING btree (gadget_type, gadget_id);

CREATE UNIQUE INDEX idx_comment_gadget_refs__unique_ref ON public.comment_gadget_refs USING btree (comment_id, gadget_type, gadget_id, COALESCE(sub_id, ''::text), display);

CREATE INDEX idx_comment_gadget_refs__workspace_id ON public.comment_gadget_refs USING btree (workspace_id);

alter table "public"."comment_gadget_refs" add constraint "comment_gadget_refs_pkey" PRIMARY KEY using index "comment_gadget_refs_pkey";

alter table "public"."comment_gadget_refs" add constraint "comment_gadget_refs__display_valid" CHECK ((display = ANY (ARRAY['link'::text, 'embed'::text]))) not valid;

alter table "public"."comment_gadget_refs" validate constraint "comment_gadget_refs__display_valid";

alter table "public"."comment_gadget_refs" add constraint "comment_gadget_refs_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_gadget_refs" validate constraint "comment_gadget_refs_comment_id_fkey";

alter table "public"."comment_gadget_refs" add constraint "comment_gadget_refs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."comment_gadget_refs" validate constraint "comment_gadget_refs_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.comments__sync_gadget_refs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  delete from public.comment_gadget_refs r where r.comment_id = new.id;

  if new.body is null then
    return null;
  end if;

  insert into public.comment_gadget_refs (comment_id, workspace_id, gadget_type, gadget_id, sub_id, display)
  select distinct new.id, new.workspace_id, ref.gadget_type, ref.gadget_id, ref.sub_id, ref.display
  from (
    select
      case
        when (node -> 'attrs' ->> 'gadgetType') = any (enum_range(null::public.gadget_type)::text[])
          then (node -> 'attrs' ->> 'gadgetType')::public.gadget_type
      end as gadget_type,
      case
        when (node -> 'attrs' ->> 'gadgetId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (node -> 'attrs' ->> 'gadgetId')::uuid
      end as gadget_id,
      nullif(node -> 'attrs' ->> 'subId', '') as sub_id,
      case when node ->> 'type' = 'gadgetEmbed' then 'embed' else 'link' end as display
    from jsonb_path_query(
      new.body,
      'lax $.** ? (@.type == "gadgetLink" || @.type == "gadgetEmbed")'
    ) as node
  ) as ref
  where ref.gadget_type is not null and ref.gadget_id is not null;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_gadgets__search(p_workspace_id uuid, p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(gadget_type public.gadget_type, gadget_id uuid, sub_id text, label text, sub_label text, has_limited_audience boolean, updated_at timestamp with time zone, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.3'
AS $function$
  with
    params as (
      select
        nullif(btrim(p_query), '') as q,
        least(greatest(coalesce(p_limit, 20), 1), 100) as row_limit
    ),
    candidates as (
      select 'dashboard'::public.gadget_type as gadget_type, d.id as gadget_id, null::text as sub_id,
        d.name as label, null::text as sub_label, d.is_restricted as has_limited_audience, d.updated_at
      from public.dashboards d
      where d.workspace_id = p_workspace_id
      union all
      select 'dashboard_tile', d.id, tile ->> 'id', tile -> 'nlQuery' ->> 'prompt', d.name, d.is_restricted, d.updated_at
      from public.dashboards d
      -- `strict`, because lax `.**` yields every block inside an array twice.
      cross join lateral (
        select node -> 'props' as tile
        from jsonb_path_query(d.config, 'strict $.** ? (@.type == "DataViz")') as node
      ) as tiles
      where d.workspace_id = p_workspace_id
        and coalesce(btrim(tile -> 'nlQuery' ->> 'prompt'), '') <> ''
        and tile ->> 'id' is not null
      union all
      select 'dataset', ds.id, null, ds.name, null, ds.is_restricted, ds.updated_at
      from public.datasets ds
      where ds.workspace_id = p_workspace_id
      union all
      select 'map', m.id, null, m.name, null, m.is_restricted, m.updated_at
      from public.maps m
      where m.workspace_id = p_workspace_id
      union all
      select 'concept', c.id, null, c.name, null, false, c.updated_at
      from public.concepts c
      where c.workspace_id = p_workspace_id
      union all
      select 'individual', i.id, null, i.name, c.name, false, i.updated_at
      from public.individuals i
      join public.concepts c on c.id = i.concept_id
      where i.workspace_id = p_workspace_id
    )
  select
    candidate.gadget_type,
    candidate.gadget_id,
    candidate.sub_id,
    candidate.label,
    candidate.sub_label,
    candidate.has_limited_audience,
    candidate.updated_at,
    case
      when params.q is null then 0::real
      else (
        case when candidate.label ilike params.q || '%' then 1 else 0 end
        + extensions.word_similarity(params.q, candidate.label)
      )::real
    end as rank
  from candidates as candidate
  cross join params
  where params.q is null
    or candidate.label ilike '%' || params.q || '%'
    or params.q operator(extensions.<%) candidate.label
  order by rank desc, candidate.updated_at desc, candidate.label, candidate.gadget_id
  limit (select row_limit from params);
$function$
;

grant select on table "public"."comment_gadget_refs" to "authenticated";

grant delete on table "public"."comment_gadget_refs" to "service_role";

grant insert on table "public"."comment_gadget_refs" to "service_role";

grant select on table "public"."comment_gadget_refs" to "service_role";

grant update on table "public"."comment_gadget_refs" to "service_role";


  create policy "User can SELECT comment_gadget_refs in their workspace"
  on "public"."comment_gadget_refs"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));


CREATE TRIGGER tr__comments__sync_gadget_refs AFTER INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments__sync_gadget_refs();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.comments__sync_gadget_refs() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_gadgets__search(p_workspace_id uuid, p_query text, p_limit integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_gadgets__search(p_workspace_id uuid, p_query text, p_limit integer) to "authenticated";
