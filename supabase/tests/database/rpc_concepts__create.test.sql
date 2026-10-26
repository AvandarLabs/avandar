\set ON_ERROR_STOP on

/**
 * `rpc_concepts__create` writes a case type with its statuses, attributes,
 * and mappings in one transaction. It runs as the caller, so RLS decides who
 * may create one, and any failure leaves nothing behind.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('ac000001-0000-4000-8000-000000000001'::uuid, 'create_rpc_owner@test.dev', 'authenticated', 'authenticated'),
  ('ac000002-0000-4000-8000-000000000002'::uuid, 'create_rpc_editor@test.dev', 'authenticated', 'authenticated'),
  ('ac000003-0000-4000-8000-000000000003'::uuid, 'create_rpc_viewer@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('ac001001-0000-4000-8000-000000000001'::uuid, 'ac000001-0000-4000-8000-000000000001'::uuid, 'create rpc ws', 'create-rpc-ws')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('ac003001-0000-4000-8000-000000000001'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'Case type creators', false),
  ('ac003002-0000-4000-8000-000000000002'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'Case type readers', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('ac003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('ac003002-0000-4000-8000-000000000002'::uuid, 'case_types', 'viewer');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('ac002001-0000-4000-8000-000000000001'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'ac000001-0000-4000-8000-000000000001'::uuid, null),
  ('ac002002-0000-4000-8000-000000000002'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'ac000002-0000-4000-8000-000000000002'::uuid, 'ac003001-0000-4000-8000-000000000001'::uuid),
  ('ac002003-0000-4000-8000-000000000003'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'ac000003-0000-4000-8000-000000000003'::uuid, 'ac003002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

-- An existing case type whose status the last assertion tries to borrow.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('ac004009-0000-4000-8000-000000000009'::uuid, 'ac000001-0000-4000-8000-000000000001'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'existing case type', true, 'ac005009-0000-4000-8000-000000000009'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('ac005009-0000-4000-8000-000000000009'::uuid, 'ac001001-0000-4000-8000-000000000001'::uuid, 'ac004009-0000-4000-8000-000000000009'::uuid, 'Active', '#40c057', 0);

select plan (15);

-- 1.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004001-0000-4000-8000-000000000001","workspace_id":"ac001001-0000-4000-8000-000000000001","owner_id":"ac000001-0000-4000-8000-000000000001","name":"Created case type","description":null,"allow_manual_creation":true,"default_status_id":"ac005001-0000-4000-8000-000000000001"}'::jsonb,
    '[{"id":"ac006001-0000-4000-8000-000000000001","name":"Name","description":null,"data_type":"varchar","mapping_type":"manual_entry","is_label":true,"is_identifier":false,"is_array":false,"allow_manual_edit":true}]'::jsonb,
    '[]'::jsonb,
    '[{"concept_attribute_id":"ac006001-0000-4000-8000-000000000001"}]'::jsonb,
    '[{"id":"ac005001-0000-4000-8000-000000000001","name":"Active","description":"Open and being worked on.","color":"#40c057","position":0},{"id":"ac005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1}]'::jsonb
  );
  $t1$,
  'a Case Types editor creates a case type'
);

reset role;

-- 2.
select is (
  (select default_status_id from public.concepts where id = 'ac004001-0000-4000-8000-000000000001'::uuid),
  'ac005001-0000-4000-8000-000000000001'::uuid,
  'the new case type defaults to the status its payload named'
);

-- 3.
select is (
  (
    select array_agg(name order by position)
    from public.concept_statuses
    where concept_id = 'ac004001-0000-4000-8000-000000000001'::uuid
  ),
  array['Active', 'Inactive'],
  'the new case type has its payload''s statuses, in order'
);

-- 4.
select is (
  (select count(*)::int from public.concept_attributes where concept_id = 'ac004001-0000-4000-8000-000000000001'::uuid),
  1,
  'the new case type has its attribute'
);

-- 5.
select is (
  (select count(*)::int from public.attribute_mappings__manual_entry where concept_attribute_id = 'ac006001-0000-4000-8000-000000000001'::uuid),
  1,
  'the new attribute has its mapping'
);

-- 6. The payload named the workspace owner, and the signed-in caller wins.
select is (
  (select owner_id from public.concepts where id = 'ac004001-0000-4000-8000-000000000001'::uuid),
  'ac000002-0000-4000-8000-000000000002'::uuid,
  'a signed-in caller owns the new case type, whatever owner the payload names'
);

-- 7. No label attribute: the label trigger raises after the statuses landed.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004002-0000-4000-8000-000000000002","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"No label","description":null,"allow_manual_creation":true,"default_status_id":"ac005003-0000-4000-8000-000000000003"}'::jsonb,
    '[{"id":"ac006002-0000-4000-8000-000000000002","name":"Name","description":null,"data_type":"varchar","mapping_type":"manual_entry","is_label":false,"is_identifier":false,"is_array":false,"allow_manual_edit":true}]'::jsonb,
    '[]'::jsonb,
    '[{"concept_attribute_id":"ac006002-0000-4000-8000-000000000002"}]'::jsonb,
    '[{"id":"ac005003-0000-4000-8000-000000000003","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t7$,
  'P0001',
  'There must be exactly one label attribute per concept',
  'a case type without a label attribute is refused'
);

-- 8.
select is (
  (select count(*)::int from public.concepts where id = 'ac004002-0000-4000-8000-000000000002'::uuid),
  0,
  'a refused attribute leaves no case type behind'
);

-- 9. The mapping names an attribute that is not in the payload.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004003-0000-4000-8000-000000000003","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Bad mapping","description":null,"allow_manual_creation":true,"default_status_id":"ac005004-0000-4000-8000-000000000004"}'::jsonb,
    '[{"id":"ac006003-0000-4000-8000-000000000003","name":"Name","description":null,"data_type":"varchar","mapping_type":"dataset_column","is_label":true,"is_identifier":true,"is_array":false,"allow_manual_edit":false}]'::jsonb,
    '[{"concept_attribute_id":"ac006099-0000-4000-8000-000000000099","value_picker_rule_type":"most_frequent","dataset_id":"ac007001-0000-4000-8000-000000000001","dataset_column_id":"ac008001-0000-4000-8000-000000000001"}]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005004-0000-4000-8000-000000000004","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t9$,
  '23503',
  null,
  'a mapping for an unknown attribute is refused'
);

-- 10.
select is (
  (select count(*)::int from public.concepts where id = 'ac004003-0000-4000-8000-000000000003'::uuid),
  0,
  'a refused mapping leaves no case type behind'
);

-- 11.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004004-0000-4000-8000-000000000004","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Viewer case type","description":null,"allow_manual_creation":true,"default_status_id":"ac005005-0000-4000-8000-000000000005"}'::jsonb,
    '[{"id":"ac006004-0000-4000-8000-000000000004","name":"Name","description":null,"data_type":"varchar","mapping_type":"manual_entry","is_label":true,"is_identifier":false,"is_array":false,"allow_manual_edit":true}]'::jsonb,
    '[]'::jsonb,
    '[{"concept_attribute_id":"ac006004-0000-4000-8000-000000000004"}]'::jsonb,
    '[{"id":"ac005005-0000-4000-8000-000000000005","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t11$,
  '42501',
  null,
  'a Case Types viewer cannot create a case type'
);

-- 12.
select is (
  (select count(*)::int from public.concepts where id = 'ac004004-0000-4000-8000-000000000004'::uuid),
  0,
  'a refused viewer leaves no case type behind'
);

-- 13. The default's foreign key is deferred, so force it inside the assertion.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"ac000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004005-0000-4000-8000-000000000005","workspace_id":"ac001001-0000-4000-8000-000000000001","name":"Borrowed default","description":null,"allow_manual_creation":true,"default_status_id":"ac005009-0000-4000-8000-000000000009"}'::jsonb,
    '[{"id":"ac006005-0000-4000-8000-000000000005","name":"Name","description":null,"data_type":"varchar","mapping_type":"manual_entry","is_label":true,"is_identifier":false,"is_array":false,"allow_manual_edit":true}]'::jsonb,
    '[]'::jsonb,
    '[{"concept_attribute_id":"ac006005-0000-4000-8000-000000000005"}]'::jsonb,
    '[{"id":"ac005006-0000-4000-8000-000000000006","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  set constraints all immediate;
  $t13$,
  '23503',
  null,
  'a case type cannot default to a status of another case type'
);

-- 14. A service-role caller, such as E2E seeding, has no signed-in user.
select lives_ok (
  $t14$
  set local role service_role;
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select public.rpc_concepts__create (
    '{"id":"ac004006-0000-4000-8000-000000000006","workspace_id":"ac001001-0000-4000-8000-000000000001","owner_id":"ac000001-0000-4000-8000-000000000001","name":"Seeded case type","description":null,"allow_manual_creation":false,"default_status_id":"ac005007-0000-4000-8000-000000000007"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[{"id":"ac005007-0000-4000-8000-000000000007","name":"Active","description":null,"color":"#40c057","position":0}]'::jsonb
  );
  $t14$,
  'the service role creates a case type'
);

reset role;

-- 15.
select is (
  (select owner_id from public.concepts where id = 'ac004006-0000-4000-8000-000000000006'::uuid),
  'ac000001-0000-4000-8000-000000000001'::uuid,
  'a service-role caller sets the owner from the payload'
);

select * from finish ();

rollback;
