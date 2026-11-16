set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_dictionaries__check_pairs(p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where jsonb_typeof(p.pair -> 'label') is distinct from 'string'
  ) then
    raise exception 'Every value needs a label, even an empty one'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where coalesce(btrim(p.pair ->> 'code'), '') = ''
  ) then
    raise exception 'Every value needs a code'
      using errcode = '23514', hint = 'code_pair_incomplete';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    group by l.list_index, lower(btrim(p.pair ->> 'code'))
    having count(*) > 1
  ) then
    raise exception 'Two codes in one list only differ in capitalization or spaces'
      using errcode = '23514', hint = 'codes_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') with ordinality as p (pair, pair_index)
    cross join lateral (
      select p.pair ->> 'label' as spelling
      union all
      select s.spelling
      from jsonb_array_elements_text(coalesce(p.pair -> 'accepted_spellings', '[]'::jsonb)) as s (spelling)
    ) as spellings
    where btrim(spellings.spelling) <> ''
    group by l.list_index, lower(btrim(spellings.spelling))
    having count(distinct p.pair_index) > 1
  ) then
    raise exception 'Two values in one list share a label or an accepted spelling'
      using errcode = '23514', hint = 'labels_not_unique';
  end if;
end;
$function$
;


