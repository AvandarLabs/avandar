create type "public"."usage_analytics_events__category" as enum ('acquisition', 'activation', 'engagement', 'expansion', 'revenue', 'other');

create type "public"."usage_analytics_events__client" as enum ('web', 'desktop', 'server', 'db');

alter table "public"."usage_analytics_events" add column "app_version" text;

alter table "public"."usage_analytics_events" add column "client" public.usage_analytics_events__client not null default 'web'::public.usage_analytics_events__client;

alter table "public"."usage_analytics_events" add column "event_category" public.usage_analytics_events__category not null default 'other'::public.usage_analytics_events__category;

CREATE INDEX usage_analytics_events__event_category__created_at_idx ON public.usage_analytics_events USING btree (event_category, created_at DESC);


