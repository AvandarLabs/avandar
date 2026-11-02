/**
 * Who receives access on a `public.resource_shares` row: one user, a
 * `user_groups` tag, or the workspace as a whole. `principal_id` names the
 * grantee for the types that have one.
 */
create type public.share_principal_type as enum('user', 'user_group', 'workspace');
