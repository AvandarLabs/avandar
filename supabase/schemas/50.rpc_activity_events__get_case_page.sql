/**
 * One page of a case's activity feed, newest first, ordered on the full
 * `(occurred_at, recorded_at, id)` keyset that
 * `idx_activity_events__individual_occurred` covers. Paging on that keyset
 * means events sharing a timestamp are never skipped or repeated across
 * pages.
 *
 * Runs as the caller, so the `activity_events` RLS policy decides which
 * events are visible.
 *
 * @param p_individual_id The case.
 * @param p_kinds The event kinds to include.
 * @param p_limit The most events to return.
 * @param p_before_occurred_at The cursor's `occurred_at`. Null for the first
 *   page.
 * @param p_before_recorded_at The cursor's `recorded_at`. Null for the first
 *   page.
 * @param p_before_id The cursor's `id`. Null for the first page.
 *
 * @returns Up to `p_limit` events strictly older than the cursor, newest
 *   first.
 */
create or replace function public.rpc_activity_events__get_case_page (
  p_individual_id uuid,
  p_kinds public.activity_events__kind[],
  p_limit int,
  p_before_occurred_at timestamptz default null,
  p_before_recorded_at timestamptz default null,
  p_before_id uuid default null
) returns setof public.activity_events as $$
  select activity_event.*
  from public.activity_events activity_event
  where
    activity_event.individual_id = p_individual_id and
    activity_event.kind = any (p_kinds) and
    (
      p_before_id is null or
      (
        activity_event.occurred_at,
        activity_event.recorded_at,
        activity_event.id
      ) < (p_before_occurred_at, p_before_recorded_at, p_before_id)
    )
  order by
    activity_event.occurred_at desc,
    activity_event.recorded_at desc,
    activity_event.id desc
  limit p_limit;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the case feed calls this through the Data API.
revoke
execute on function public.rpc_activity_events__get_case_page (
  uuid,
  public.activity_events__kind[],
  int,
  timestamptz,
  timestamptz,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_activity_events__get_case_page (
  uuid,
  public.activity_events__kind[],
  int,
  timestamptz,
  timestamptz,
  uuid
) to authenticated;
