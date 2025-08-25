BEGIN;

-- Ensure RLS is on (safe if already on)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 0) Drop anything that might reference user_roles.user_id
ALTER TABLE IF EXISTS public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

DROP INDEX IF EXISTS public.idx_user_roles__user_id_workspace_id;

-- 1) Add new column (nullable) if missing
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS user_profile_id uuid;

-- 2) Backfill from user_profiles via membership (primary path)
UPDATE public.user_roles ur
SET user_profile_id = p.id
FROM public.user_profiles p
WHERE p.membership_id = ur.membership_id
  AND ur.user_profile_id IS NULL;

-- 2b) Safety fallback using workspace_memberships + user_profiles
UPDATE public.user_roles ur
SET user_profile_id = p2.id
FROM public.user_profiles p2, public.workspace_memberships wm
WHERE ur.user_profile_id IS NULL
  AND wm.id = ur.membership_id
  AND p2.user_id = wm.user_id
  AND p2.workspace_id = ur.workspace_id;

-- 3) Add FK (only if missing) — cannot use IF NOT EXISTS for constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'user_roles'
      AND c.conname = 'user_roles_user_profile_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_profile_id_fkey
      FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Drop ALL existing policies on user_roles (some may reference user_id)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END $$;

-- 5) Now drop the old column
ALTER TABLE public.user_roles
  DROP COLUMN IF EXISTS user_id;

-- 6) (Re)create helper function used by policies
CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces_by_role(role text)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN ARRAY(
    SELECT ur.workspace_id
    FROM public.user_roles ur
    JOIN public.workspace_memberships wm
      ON wm.id = ur.membership_id
    WHERE wm.user_id = auth.uid()
      AND ur.role = $1
  );
END;
$$;

-- 7) Recreate policies **without** any reference to user_roles.user_id
CREATE POLICY "User can SELECT own user_roles; Admins can SELECT in admin workspaces"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      WHERE wm.id = public.user_roles.membership_id
        AND wm.user_id = auth.uid()
    )
    OR public.user_roles.workspace_id = ANY ( public.util__get_auth_user_workspaces_by_role('admin') )
  );

CREATE POLICY "Owner can INSERT own user_roles; Admin can INSERT"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      WHERE wm.id = public.user_roles.membership_id
        AND wm.user_id = auth.uid()
    )
    OR public.user_roles.workspace_id = ANY ( public.util__get_auth_user_workspaces_by_role('admin') )
  );

CREATE POLICY "Admin can UPDATE user_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING ( public.user_roles.workspace_id = ANY ( public.util__get_auth_user_workspaces_by_role('admin') ) )
  WITH CHECK ( public.user_roles.workspace_id = ANY ( public.util__get_auth_user_workspaces_by_role('admin') ) );

CREATE POLICY "User can DELETE own user_roles; Admin can DELETE"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      WHERE wm.id = public.user_roles.membership_id
        AND wm.user_id = auth.uid()
    )
    OR public.user_roles.workspace_id = ANY ( public.util__get_auth_user_workspaces_by_role('admin') )
  );

-- 8) Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles__user_profile_id
  ON public.user_roles(user_profile_id);

CREATE INDEX IF NOT EXISTS idx_user_roles__workspace_id
  ON public.user_roles(workspace_id);

-- Optional: if you want to enforce one role per membership per role name
-- (safe if it already exists; use IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_membership_role_unique
  ON public.user_roles (membership_id, role);

-- 9) Triggers (updated to guard the correct identity columns)
CREATE OR REPLACE FUNCTION public.user_roles__prevent_id_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_profile_id <> OLD.user_profile_id
     OR NEW.workspace_id    <> OLD.workspace_id
     OR NEW.membership_id   <> OLD.membership_id THEN
    RAISE EXCEPTION 'user_profile_id, workspace_id, and membership_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_user_roles__prevent_id_changes ON public.user_roles;
CREATE TRIGGER tr_user_roles__prevent_id_changes
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.user_roles__prevent_id_changes();

-- If you already have util__set_updated_at(), keep the updated_at trigger
DROP TRIGGER IF EXISTS tr_user_roles__set_updated_at ON public.user_roles;
CREATE TRIGGER tr_user_roles__set_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

-- 10) Finally enforce NOT NULL
ALTER TABLE public.user_roles
  ALTER COLUMN user_profile_id SET NOT NULL;

COMMIT;
