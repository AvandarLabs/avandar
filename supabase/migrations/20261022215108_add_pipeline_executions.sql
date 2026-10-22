create type "public"."pipeline_execution_scopes__status" as enum ('succeeded', 'failed', 'skipped');

create type "public"."pipeline_executions__command" as enum ('run', 'reset', 'prune_retired_scopes');

create type "public"."pipeline_executions__invoked_via" as enum ('cli_local', 'cli_server', 'http');

create type "public"."pipeline_executions__run_mode" as enum ('full', 'incremental');

create type "public"."pipeline_executions__status" as enum ('running', 'succeeded', 'partially_failed', 'failed', 'cancelled');

  create table "public"."pipeline_execution_scopes" (
    "id" uuid not null default gen_random_uuid(),
    "execution_id" uuid not null,
    "pipeline_name" text not null,
    "drive_key" text not null,
    "scope_key" text not null,
    "status" public.pipeline_execution_scopes__status not null,
    "error" text,
    "window_since" timestamp with time zone,
    "window_until" timestamp with time zone,
    "checkpoint_before" timestamp with time zone,
    "checkpoint_after" timestamp with time zone,
    "started_at" timestamp with time zone not null,
    "finished_at" timestamp with time zone not null,
    "duration_ms" bigint generated always as (((EXTRACT(epoch FROM (finished_at - started_at)) * (1000)::numeric))::bigint) stored,
    "setup_ms" bigint not null default 0,
    "extract_ms" bigint not null default 0,
    "transform_ms" bigint not null default 0,
    "load_read_ms" bigint not null default 0,
    "load_parquet_build_ms" bigint not null default 0,
    "load_parquet_upload_ms" bigint not null default 0,
    "load_write_ms" bigint not null default 0,
    "checkpoint_write_ms" bigint not null default 0,
    "page_count" integer not null default 0,
    "datasets_fetched" integer not null default 0,
    "listings_considered" integer not null default 0,
    "listings_written" integer not null default 0,
    "listings_unchanged" integer not null default 0,
    "write_batches" integer not null default 0,
    "columns_considered" integer not null default 0,
    "columns_written" integer not null default 0,
    "max_columns_per_listing" integer not null default 0,
    "avg_columns_per_listing" numeric generated always as (((columns_considered)::numeric / (NULLIF(listings_considered, 0))::numeric)) stored,
    "source_csv_bytes" bigint not null default 0,
    "parquet_bytes_written" bigint not null default 0,
    "parquet_rows_written" bigint not null default 0,
    "parquet_uploads_skipped" integer not null default 0,
    "source_bytes_reported" bigint,
    "listings_deleted" integer not null default 0,
    "listings_kept_in_use" integer not null default 0,
    "listings_detached" integer not null default 0,
    "checkpoints_deleted" integer not null default 0,
    "pipeline_metrics" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pipeline_execution_scopes" enable row level security;


  create table "public"."pipeline_executions" (
    "id" uuid not null default gen_random_uuid(),
    "pipeline_name" text not null,
    "command" public.pipeline_executions__command not null,
    "run_mode" public.pipeline_executions__run_mode,
    "is_dry_run" boolean not null default false,
    "is_scoped" boolean not null default false,
    "is_limited" boolean not null default false,
    "is_windowed" boolean not null default false,
    "invoked_via" public.pipeline_executions__invoked_via not null,
    "cli_argv" text[],
    "request_body" jsonb,
    "arguments" jsonb not null default '{}'::jsonb,
    "actor" text,
    "host" text,
    "code_version" text,
    "status" public.pipeline_executions__status not null default 'running'::public.pipeline_executions__status,
    "error" text,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "duration_ms" bigint generated always as (((EXTRACT(epoch FROM (finished_at - started_at)) * (1000)::numeric))::bigint) stored,
    "setup_ms" bigint not null default 0,
    "extract_ms" bigint not null default 0,
    "transform_ms" bigint not null default 0,
    "load_read_ms" bigint not null default 0,
    "load_parquet_build_ms" bigint not null default 0,
    "load_parquet_upload_ms" bigint not null default 0,
    "load_write_ms" bigint not null default 0,
    "checkpoint_write_ms" bigint not null default 0,
    "drive_count" integer not null default 0,
    "scope_count" integer not null default 0,
    "page_count" integer not null default 0,
    "datasets_fetched" integer not null default 0,
    "listings_considered" integer not null default 0,
    "listings_written" integer not null default 0,
    "listings_unchanged" integer not null default 0,
    "write_batches" integer not null default 0,
    "columns_considered" integer not null default 0,
    "columns_written" integer not null default 0,
    "max_columns_per_listing" integer not null default 0,
    "source_csv_bytes" bigint not null default 0,
    "parquet_bytes_written" bigint not null default 0,
    "parquet_rows_written" bigint not null default 0,
    "parquet_uploads_skipped" integer not null default 0,
    "source_bytes_reported" bigint,
    "listings_deleted" integer not null default 0,
    "listings_kept_in_use" integer not null default 0,
    "listings_detached" integer not null default 0,
    "checkpoints_deleted" integer not null default 0,
    "workspace_datasets_deleted" integer not null default 0,
    "catalog_listings" integer,
    "catalog_prebuilt_listings" integer,
    "catalog_api_listings" integer,
    "catalog_verified_listings" integer,
    "catalog_unverified_listings" integer,
    "catalog_columns" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."pipeline_executions" enable row level security;

CREATE INDEX pipeline_execution_scopes__drive_started ON public.pipeline_execution_scopes USING btree (pipeline_name, drive_key, started_at DESC);

CREATE INDEX pipeline_execution_scopes__execution ON public.pipeline_execution_scopes USING btree (execution_id);

CREATE UNIQUE INDEX pipeline_execution_scopes_pkey ON public.pipeline_execution_scopes USING btree (id);

CREATE INDEX pipeline_executions__pipeline_started ON public.pipeline_executions USING btree (pipeline_name, started_at DESC);

CREATE UNIQUE INDEX pipeline_executions_pkey ON public.pipeline_executions USING btree (id);

alter table "public"."pipeline_execution_scopes" add constraint "pipeline_execution_scopes_pkey" PRIMARY KEY using index "pipeline_execution_scopes_pkey";

alter table "public"."pipeline_executions" add constraint "pipeline_executions_pkey" PRIMARY KEY using index "pipeline_executions_pkey";

alter table "public"."pipeline_execution_scopes" add constraint "pipeline_execution_scopes_execution_id_fkey" FOREIGN KEY (execution_id) REFERENCES public.pipeline_executions(id) ON DELETE CASCADE not valid;

alter table "public"."pipeline_execution_scopes" validate constraint "pipeline_execution_scopes_execution_id_fkey";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__finished_unless_running" CHECK (((status = 'running'::public.pipeline_executions__status) = (finished_at IS NULL))) not valid;

alter table "public"."pipeline_executions" validate constraint "pipeline_executions__finished_unless_running";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__run_mode_only_on_runs" CHECK (((command = 'run'::public.pipeline_executions__command) = (run_mode IS NOT NULL))) not valid;

alter table "public"."pipeline_executions" validate constraint "pipeline_executions__run_mode_only_on_runs";

grant delete on table "public"."pipeline_execution_scopes" to "service_role";

grant insert on table "public"."pipeline_execution_scopes" to "service_role";

grant select on table "public"."pipeline_execution_scopes" to "service_role";

grant update on table "public"."pipeline_execution_scopes" to "service_role";

grant delete on table "public"."pipeline_executions" to "service_role";

grant insert on table "public"."pipeline_executions" to "service_role";

grant select on table "public"."pipeline_executions" to "service_role";

grant update on table "public"."pipeline_executions" to "service_role";

CREATE TRIGGER tr__pipeline_executions__set_updated_at BEFORE UPDATE ON public.pipeline_executions FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


