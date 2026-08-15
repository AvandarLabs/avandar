create or replace function public.util__storage_object_dashboard_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path to 'public' as $function$
  select case
    when split_part(p_object_name, '/', 1) = 'dashboards'
      and split_part(p_object_name, '/', 3) = 'datasets'
      and split_part(p_object_name, '/', 2) ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$function$;
