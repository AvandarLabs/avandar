/**
 * Keeps the body a comment is about to lose. On an edit, a change to `body`,
 * `body_text`, or `body_schema_version`, it stores the old body as an `edit`
 * revision and stamps `edited_at`. On a delete it stores the body as a
 * `delete` revision and clears `body` and `body_text`.
 */
create or replace function public.comments__record_revision () returns trigger language plpgsql security definer
set
  search_path = '' as $$
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
$$;

revoke
execute on function public.comments__record_revision ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__record_revision before
update on public.comments for each row
execute function public.comments__record_revision ();

/**
 * Logs a comment's creation, edits, and deletion in `activity_events`. Edits
 * and deletes carry the id of the revision `comments__record_revision` just
 * wrote. An update that changes neither the body nor `deleted_at` logs
 * nothing.
 */
create or replace function public.comments__record_activity () returns trigger language plpgsql security definer
set
  search_path = '' as $$
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
$$;

revoke
execute on function public.comments__record_activity ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__record_activity
after insert or
update on public.comments for each row
execute function public.comments__record_activity ();

/**
 * Rebuilds a comment's `comment_mentions` from the `userMention` nodes in its
 * stored document, keeping only valid ids of workspace members. A deleted
 * comment has no mentions. Fires on every update (no column list) because a
 * delete only sets `deleted_at` in the statement and the before trigger
 * clears `body`.
 */
create or replace function public.comments__sync_mentions () returns trigger language plpgsql security definer
set
  search_path = '' as $$
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
$$;

revoke
execute on function public.comments__sync_mentions ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__sync_mentions
after insert or
update on public.comments for each row
execute function public.comments__sync_mentions ();

/**
 * Rebuilds a comment's `comment_gadget_refs` from the `gadgetLink` and
 * `gadgetEmbed` nodes in its stored document, keeping only nodes with a
 * known gadget type, a valid uuid id, and a `subId` only when the type is
 * `dashboard_tile`. A deleted comment references nothing. Fires on every update (no column list) for the same reason as
 * `comments__sync_mentions`. It does not check that the gadget exists or
 * that the author can see it: reading a reference goes through the reader's
 * own access.
 */
create or replace function public.comments__sync_gadget_refs () returns trigger language plpgsql security definer
set
  search_path = '' as $$
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
  where ref.gadget_type is not null
    and ref.gadget_id is not null
    and (ref.gadget_type = 'dashboard_tile') = (ref.sub_id is not null);

  return null;
end;
$$;

revoke
execute on function public.comments__sync_gadget_refs ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__sync_gadget_refs
after insert or
update on public.comments for each row
execute function public.comments__sync_gadget_refs ();
