/**
 * Whether a listing last changed within one of the catalog's update windows.
 * The windows are cumulative: a listing updated last week is also within the
 * past year. A listing with no date is in `any` and in no other window.
 *
 * Windows:
 *
 * `any`: every listing.
 *
 * `past_month`: changed in the last 31 days.
 *
 * `past_year`: changed in the last 365 days.
 *
 * `over_a_year`: last changed more than 365 days ago.
 *
 * @param p_last_updated_at When the listing last changed, as the catalog dates
 * it: the source's own update date, otherwise Avandar's last sync.
 * @param p_updated_within One of the windows above. Any other value is in no
 * window; callers validate it first.
 */
create or replace function public.data_catalog_listings__is_updated_within (
  p_last_updated_at timestamptz,
  p_updated_within text
) returns boolean as $$
  select
    case p_updated_within
      when 'any' then true
      when 'past_month' then
        coalesce(p_last_updated_at >= now() - interval '31 days', false)
      when 'past_year' then
        coalesce(p_last_updated_at >= now() - interval '365 days', false)
      when 'over_a_year' then
        coalesce(p_last_updated_at < now() - interval '365 days', false)
      else false
    end;
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the catalog's search and facet RPCs run as the
-- caller and call this for every listing.
revoke all on function public.data_catalog_listings__is_updated_within (timestamptz, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.data_catalog_listings__is_updated_within (timestamptz, text) to authenticated;
