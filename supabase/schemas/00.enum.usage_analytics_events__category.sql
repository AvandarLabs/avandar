-- Funnel stage a usage analytics event belongs to. Stored on every
-- `usage_analytics_events` row so reporting can group by lifecycle stage
-- instead of hard-coding lists of event names.
--
-- `expansion` covers the account growing or shrinking through people and
-- reach: invites, invite acceptances, seat removals, and public dashboard
-- views.
--
-- `other` is the fallback for an event name that has not been categorised in
-- `public.util__analytics_event_category`. It exists so a typo'd or
-- newly-added event name can never reject an insert. Find them with
-- `where event_category = 'other'`.
create type public.usage_analytics_events__category as enum(
  'acquisition',
  'activation',
  'engagement',
  'expansion',
  'revenue',
  'other'
);
