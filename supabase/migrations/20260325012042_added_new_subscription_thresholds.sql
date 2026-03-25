alter table "public"."subscriptions"
add column "max_dashboards_allowed" integer;

alter table "public"."subscriptions"
add column "max_datasets_allowed" integer;

alter table "public"."subscriptions"
add column "max_shareable_dashboards_allowed" integer;

update "public"."subscriptions"
set
  "max_seats_allowed" = 2,
  "max_datasets_allowed" = 5,
  "max_dashboards_allowed" = 5,
  "max_shareable_dashboards_allowed" = 1
where
  "feature_plan_type" = 'free';

update "public"."subscriptions"
set
  "max_seats_allowed" = 1,
  "max_datasets_allowed" = 10,
  "max_dashboards_allowed" = null,
  "max_shareable_dashboards_allowed" = null
where
  "feature_plan_type" = 'basic';

update "public"."subscriptions"
set
  "max_seats_allowed" = 1,
  "max_datasets_allowed" = 100,
  "max_dashboards_allowed" = null,
  "max_shareable_dashboards_allowed" = null
where
  "feature_plan_type" = 'premium';
