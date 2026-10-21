  create table "public"."pipeline_scope_checkpoints" (
    "pipeline_name" text not null,
    "drive_key" text not null,
    "scope_key" text not null,
    "high_water_mark" timestamp with time zone not null,
    "pipeline_run_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."pipeline_scope_checkpoints" enable row level security;

alter table "public"."data_catalog_listings" add column "pipeline_scope_keys" text[] not null default '{}'::text[];

CREATE UNIQUE INDEX pipeline_scope_checkpoints_pkey ON public.pipeline_scope_checkpoints USING btree (pipeline_name, drive_key, scope_key);

alter table "public"."pipeline_scope_checkpoints" add constraint "pipeline_scope_checkpoints_pkey" PRIMARY KEY using index "pipeline_scope_checkpoints_pkey";

grant delete on table "public"."pipeline_scope_checkpoints" to "service_role";

grant insert on table "public"."pipeline_scope_checkpoints" to "service_role";

grant select on table "public"."pipeline_scope_checkpoints" to "service_role";

grant update on table "public"."pipeline_scope_checkpoints" to "service_role";

CREATE TRIGGER tr_pipeline_scope_checkpoints__set_updated_at BEFORE UPDATE ON public.pipeline_scope_checkpoints FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


