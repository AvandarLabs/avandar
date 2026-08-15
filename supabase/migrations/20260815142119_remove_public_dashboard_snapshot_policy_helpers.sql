drop function if exists "public"."util__auth_user_can_delete_dashboard_snapshot_object" (
  p_bucket_id text,
  p_object_name text
);

drop function if exists "public"."util__auth_user_can_delete_dashboard_snapshot_object" (
  p_object_name text
);

drop function if exists "public"."util__auth_user_can_modify_dashboard_snapshot_object" (
  p_object_name text
);

drop function if exists "public"."util__auth_user_can_write_dashboard_snapshot_object" (
  p_bucket_id text,
  p_object_name text
);

drop function if exists "public"."util__auth_user_can_write_dashboard_snapshot_object" (
  p_object_name text
);
