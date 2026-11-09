alter table "public"."maps" add column "jitter_salt" uuid not null default gen_random_uuid();

