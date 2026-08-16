-- Classifies the grantee on public.resource_shares (who receives access): one
-- user, a user_group tag, or the workspace. Use principal_id when it applies.
-- "Principal" is standard security vocabulary for the entity a permission is
-- granted to (user, group, etc.), distinct from the shared resource. Matches
-- AWS/GCP "principal" and RBAC/ABAC subject-vs-resource wording.
create type public.share_principal_type as enum('user', 'user_group', 'workspace');
