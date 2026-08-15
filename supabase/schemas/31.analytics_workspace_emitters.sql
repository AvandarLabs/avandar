-- Analytics emitters for the workspace lifecycle: a workspace appearing, and a
-- member leaving it.
--
-- These live here rather than in `01.workspaces.sql` and
-- `03.workspace_memberships.sql`, where the per-table rule would normally put
-- them, because they call `public.util__log_analytics_event`, which
-- `30.usage_analytics_events.sql` defines. Schema files are applied in
-- lexicographic order, so a `01.` file cannot depend on a `30.` one. This is
-- the same reason `31.analytics_event_emitters.sql` exists.
--
-- Both bodies are wrapped in `exception when others then return null` on top of
-- the `exception` block inside `util__log_analytics_event`, so a failure while
-- building a payload cannot roll back a workspace creation or a member removal.
-- Records `workspace.created`.
--
-- `isFirstWorkspaceForUser` is the activation signal that separates a real
-- second team from a user still finding their footing. It is computed AFTER the
-- insert, so the first workspace is the one where the owner's workspace count
-- is exactly 1.
--
-- `secondsSinceUserRegistered` is null when the owner has no `auth.users` row,
-- which happens only for a fixture or a partially-seeded database. Recording
-- null is correct there; guessing zero would report instant activation.
--
-- @returns: trigger
create or replace function public.workspaces__log_created_analytics_event () returns trigger as $$
declare
  v_user_created_at timestamptz;
begin
  select u.created_at into v_user_created_at
  from auth.users u
  where u.id = new.owner_id;

  perform public.util__log_analytics_event(
    'workspace.created',
    new.id,
    new.owner_id,
    null,
    jsonb_build_object(
      'isFirstWorkspaceForUser',
      (
        select count(*) = 1
        from public.workspaces w
        where w.owner_id = new.owner_id
      ),
      'secondsSinceUserRegistered',
      case
        when v_user_created_at is null then null
        else floor(
          extract(
            epoch
            from
              (new.created_at - v_user_created_at)
          )
        )
      end
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.workspaces__log_created_analytics_event ()
from
  public,
  anon,
  authenticated;

create trigger tr__workspaces__log_created_analytics_event
after insert on public.workspaces for each row
execute function public.workspaces__log_created_analytics_event ();

-- Records `member.removed`.
--
-- `auth.uid()` is the actor who performed the removal, which is not the member
-- who left: an admin usually removes someone else. It is null for a cascade or
-- a service-role script, and the column is nullable to allow that.
--
-- One case records nothing, deliberately. When a workspace is deleted its
-- memberships cascade, this trigger fires, and the analytics insert fails its
-- foreign key to a workspace that no longer exists.
-- `util__log_analytics_event` swallows that, so the workspace delete still
-- succeeds. Nothing is lost: `usage_analytics_events.workspace_id` cascades on
-- delete too, so those rows would have been removed with the workspace anyway.
--
-- @returns: trigger
create or replace function public.workspace_memberships__log_removed_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'member.removed',
    old.workspace_id,
    auth.uid(),
    'settings'::public.app_type,
    jsonb_build_object(
      'memberCountAfter',
      (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = old.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.workspace_memberships__log_removed_analytics_event ()
from
  public,
  anon,
  authenticated;

create trigger tr__workspace_memberships__log_removed_analytics_event
after delete on public.workspace_memberships for each row
execute function public.workspace_memberships__log_removed_analytics_event ();
