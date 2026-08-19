-- Lifecycle state of one user's run through one onboarding tutorial.
--
--   not_started - the invite has never been answered. This is the only value
--                 that lets the auto-check run and the welcome modal appear.
--   in_progress - the invite HAS been answered, by either button, and the
--                 tutorial is neither finished nor dismissed. Read it as
--                 "offered", not as "actively touring". Writing it on the
--                 "Not now" path too is what makes the invite show once.
--   completed   - every milestone is done, or every milestone was already
--                 satisfied by existing work when the tutorial first loaded.
--   dismissed   - the user explicitly dismissed the checklist. Only the
--                 restart control on the profile page brings it back.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.nux_status as enum(
  'not_started',
  'in_progress',
  'completed',
  'dismissed'
);
