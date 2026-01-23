alter table "public"."datasets__csv_file"
alter column "offline_only"
set not null;

-- Set all existing CSV datasets to be offline-only just because this is a new
-- feature.
update "public"."datasets__csv_file"
set
  "offline_only" = true
where
  "offline_only" is distinct from true;
