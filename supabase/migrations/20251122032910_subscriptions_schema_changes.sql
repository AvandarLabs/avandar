alter table "public"."subscriptions" drop constraint "subscriptions_pkey";

drop index if exists "public"."subscriptions_pkey";

alter table "public"."subscriptions" drop column "id";

alter table "public"."waitlist_signups" enable row level security;

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (polar_subscription_id);

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";


