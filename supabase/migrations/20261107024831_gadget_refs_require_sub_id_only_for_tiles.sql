set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.comments__sync_gadget_refs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  delete from public.comment_gadget_refs r where r.comment_id = new.id;

  if new.body is null then
    return null;
  end if;

  insert into public.comment_gadget_refs (comment_id, workspace_id, gadget_type, gadget_id, sub_id, display)
  select distinct new.id, new.workspace_id, ref.gadget_type, ref.gadget_id, ref.sub_id, ref.display
  from (
    select
      case
        when (node -> 'attrs' ->> 'gadgetType') = any (enum_range(null::public.gadget_type)::text[])
          then (node -> 'attrs' ->> 'gadgetType')::public.gadget_type
      end as gadget_type,
      case
        when (node -> 'attrs' ->> 'gadgetId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (node -> 'attrs' ->> 'gadgetId')::uuid
      end as gadget_id,
      nullif(node -> 'attrs' ->> 'subId', '') as sub_id,
      case when node ->> 'type' = 'gadgetEmbed' then 'embed' else 'link' end as display
    from jsonb_path_query(
      new.body,
      'lax $.** ? (@.type == "gadgetLink" || @.type == "gadgetEmbed")'
    ) as node
  ) as ref
  where ref.gadget_type is not null
    and ref.gadget_id is not null
    and (ref.gadget_type = 'dashboard_tile') = (ref.sub_id is not null);

  return null;
end;
$function$
;


