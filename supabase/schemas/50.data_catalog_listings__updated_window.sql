/**
 * The dates one of the catalog's update windows covers, as a range over a
 * listing's last update date. The windows are cumulative: a listing updated
 * last week is also within the past year.
 *
 * Windows:
 *
 * `any`: every date, unbounded. Listings with no date are also in `any`,
 * which the range cannot say, so callers treat `any` as keeping everything.
 *
 * `past_month`: changed in the last 31 days.
 *
 * `past_year`: changed in the last 365 days.
 *
 * `over_a_year`: last changed more than 365 days ago.
 *
 * Search filters by the range's bounds rather than by
 * `data_catalog_listings__is_updated_within`, so the last-update index can
 * serve the filter.
 *
 * @param p_updated_within One of the windows above.
 *
 * @returns The window's dates, lower bound inclusive and upper bound
 * exclusive, or null for an unknown window.
 */
create or replace function public.data_catalog_listings__updated_window (p_updated_within text) returns tstzrange as $$
  select
    case p_updated_within
      when 'any' then tstzrange(null, null)
      when 'past_month' then tstzrange(now() - interval '31 days', null, '[)')
      when 'past_year' then tstzrange(now() - interval '365 days', null, '[)')
      when 'over_a_year' then tstzrange(null, now() - interval '365 days', '[)')
    end;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's search runs as the caller.
revoke all on function public.data_catalog_listings__updated_window (text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__updated_window (text) to authenticated;
