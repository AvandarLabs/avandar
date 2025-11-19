-- Valid feature plan types for a subscription.
create type public.subscriptions__feature_plan_type as enum(
  'free',
  'basic',
  'premium'
);

create type public.subscriptions__status as enum(
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

create type public.subscriptions__update_status as enum(
  'pending',
  'completed'
);

-- Table representing existing susbscriptions which associates a subscription
-- to a workspace and a billing manager (the workspace owner).
create table public.subscriptions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this subscription belongs to
  workspace_id uuid not null unique references public.workspaces (id) on update cascade on delete restrict,
  -- User who is the billing manager for this subscription
  subscription_owner_id uuid not null references auth.users (id) on update cascade on delete restrict,
  -- The customer id for this subscription in Polar
  polar_customer_id uuid not null,
  -- The customer email for this subscription in Polar
  polar_customer_email text not null,
  -- Polar subscription id
  polar_subscription_id uuid not null,
  -- The Polar product id that the user is subscribed to
  polar_product_id uuid not null,
  -- Timestamp when this row was created
  created_at timestamptz not null default now(),
  -- Timestamp for last update of this row
  updated_at timestamptz not null default now(),
  -- Timestamp of when the subscription started
  started_at timestamptz,
  -- Timestamp of when the subscription ends
  ends_at timestamptz,
  -- Timestamp of when the subscription officially ended. This only gets populated
  -- once the `ends_at` timestamp has elapsed.
  ended_at timestamptz,
  -- Timestamp of when the current period started
  current_period_start timestamptz,
  -- Timestamp of when the current period ends
  current_period_end timestamptz,
  -- The feature plan type of the subscription
  feature_plan_type public.subscriptions__feature_plan_type not null,
  -- The status of the subscription on Polar
  subscription_status public.subscriptions__status not null,
  -- The number of seats that are allowed in this subscription.
  -- If on a free plan, this number needs to be explicitly set. If on a paid
  -- plan, it depends on how many seats they've paid for (which we get from the
  -- Polar API).
  max_seats_allowed integer not null
);

-- Indexes to improve performance
create index idx_subscriptions__workspace_id on public.subscriptions (
  workspace_id
);

create index idx_subscriptions__subscription_owner_id_workspace_id on public.subscriptions (
  subscription_owner_id,
  workspace_id
);

-- Enable row level security
alter table public.subscriptions enable row level security;

------------------------------
-- Policies: subscriptions
-- Only SELECT policies have been added.
-- No INSERT, UPDATE, or DELETE policies have been added because we only allow
-- these changes to be made via Edge Functions using a Supabase Admin client.
------------------------------
create policy "
  User can SELECT their own subscriptions;
  User can SELECT subscriptions of a workspace they are also in
" on public.subscriptions for
select
  to authenticated using (
    -- User can select their own subscriptions
    public.subscriptions.subscription_owner_id = (
      select
        auth.uid ()
    ) or
    -- User can select subscriptions belonging to a workspace they are also in
    -- This allows authenticated users to see the subscription details of their
    -- own workspace.
    public.subscriptions.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
