BEGIN;

-- Create missing user_profiles (idempotent)
INSERT INTO public.user_profiles (
  id,
  membership_id,
  user_id,
  workspace_id,
  full_name,
  display_name,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  wm.id,
  wm.user_id,
  wm.workspace_id,
  COALESCE(SPLIT_PART(u.email, '@', 1), 'Member'),
  COALESCE(SPLIT_PART(u.email, '@', 1), 'Member'),
  NOW(),
  NOW()
FROM public.workspace_memberships wm
LEFT JOIN public.user_profiles p
  ON p.membership_id = wm.id
LEFT JOIN auth.users u
  ON u.id = wm.user_id
WHERE p.id IS NULL;

-- Create missing 'member' roles for memberships that don't have it (idempotent)
INSERT INTO public.user_roles (
  id,
  workspace_id,
  membership_id,
  user_profile_id,
  role,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  wm.workspace_id,
  wm.id,
  p.id,
  'member',
  NOW(),
  NOW()
FROM public.workspace_memberships wm
JOIN public.user_profiles p
  ON p.membership_id = wm.id
LEFT JOIN public.user_roles r
  ON r.membership_id = wm.id
 AND r.role = 'member'
WHERE r.membership_id IS NULL;

COMMIT;
