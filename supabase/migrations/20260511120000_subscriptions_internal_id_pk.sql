-- Adds Avandar-owned primary key `id` and makes Polar identifiers optional so
-- native free subscriptions can exist without a Polar subscription row.
-- Existing paid rows keep their `polar_subscription_id` values; no data loss.

alter table "public"."subscriptions"
add column "id" uuid not null default gen_random_uuid();

alter table "public"."subscriptions"
drop constraint "subscriptions_pkey";

drop index if exists "public"."subscriptions_pkey";

alter table "public"."subscriptions"
add constraint "subscriptions_pkey" primary key ("id");

create unique index "subscriptions_polar_subscription_id_key" on public.subscriptions using btree (
  "polar_subscription_id"
);

alter table "public"."subscriptions"
alter column "polar_subscription_id" drop not null;

alter table "public"."subscriptions"
alter column "polar_customer_id" drop not null;

alter table "public"."subscriptions"
alter column "polar_customer_email" drop not null;

alter table "public"."subscriptions"
alter column "polar_product_id" drop not null;
