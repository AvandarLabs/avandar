# Multi-tenancy Implementation Plan

This document outlines the step-by-step changes required to implement multi-tenancy in our application with the following requirements:

- Each user can be part of multiple workspaces (tenants)
- Each workspace can have multiple users
- Users can have different email addresses per workspace
- RLS policies must account for tenant ID, not just auth user ID

## 1. Database Schema Changes

### 1.1 Create Workspaces Table

- [x] Create a new `workspaces` table with the following columns:
  - `id` (UUID, primary key)
  - `name` (text, not null)
  - `created_at` (timestamp with timezone)
  - `updated_at` (timestamp with timezone)
  - `slug` (text, unique, not null)

### 1.2 Create Workspace Memberships

- [x] Create a new `workspace_memberships` table with:
  - `id` (UUID, primary key)
  - `workspace_id` (UUID, foreign key to workspaces.id)
  - `user_id` (UUID, foreign key to auth.users.id)
  - `role` (text, e.g., 'admin', 'member')
  - `created_at` (timestamp with timezone)
  - `updated_at` (timestamp with timezone)
  - Add a unique constraint on (`workspace_id`, `user_id`)

### 1.3 Update Existing Tables

- [x] Add `workspace_id` column to the following tables:

  - `entity_configs`
  - `entity_field_configs`
  - `entities`
  - `entity_fields`
  - All other application-specific tables that store user data

- [x] Update foreign keys and indices as needed

## 2. Authentication System Changes

### 2.1 Supabase Auth Configuration

- [x] Review default Supabase auth settings to ensure compatibility with the multi-tenant model
- [x] Ensure auth settings allow for multiple active sessions (for users switching between workspaces with different emails)

### 2.2 Sign-Up Flow Changes

- [ ] Modify `src/routes/auth/signup/page.tsx` to associate new users with a workspace
- [ ] Update `src/clients/AuthClient.ts` to handle workspace context during sign-up

### 2.3 Sign-In Flow Changes

- [ ] Modify `src/routes/auth/signin/page.tsx` to handle workspace context during sign-in
- [ ] Update `src/clients/AuthClient.ts` to support workspace-specific authentication
- [ ] Add ability to maintain multiple authenticated sessions (different email accounts) simultaneously

### 2.4 Session Management

- [ ] Update `src/lib/hooks/auth/useSession.ts` to handle multiple active sessions
- [ ] Create a new `useWorkspace` hook in `src/lib/hooks/auth/useWorkspace.ts` for workspace-specific operations
- [ ] Add workspace switching capability in the app header/sidebar
- [ ] Implement local storage to track active workspace sessions
- [ ] Create a workspace selector UI component

## 3. Row Level Security (RLS) Policy Updates

### 3.1 Create Helper Functions

- [ ] Create a Postgres function `util__get_user_workspaces(user_id UUID)` that returns all workspace IDs a user belongs to
- [ ] Create a Postgres function `util__is_workspace_member(user_id UUID, workspace_id UUID)` that checks if a user is a member of a specific workspace

### 3.2 Update RLS Policies

- [ ] Update all existing RLS policies to check workspace membership, replacing patterns like:

  - From: `auth.uid() = owner_id`
  - To: `auth.uid() = owner_id AND workspace_id = any(util__get_user_workspaces(auth.uid()))`

- [ ] Create new RLS policies for the new tables:
  - `workspaces` table
  - `workspace_memberships` table

## 4. API and Client Changes

### 4.1 Supabase Client Updates

- [ ] Update `src/lib/clients/supabase/SupabaseDBClient.ts` to include workspace context in requests
- [ ] Modify `src/lib/clients/supabase/SupabaseCRUDClient.ts` to automatically include workspace_id in queries

### 4.2 Model Client Updates

- [ ] Update all model clients to include workspace_id in their database operations:
  - `src/models/EntityConfig/EntityConfigClient.ts`
  - `src/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient.ts`
  - All other model clients

### 4.3 Create Workspace Management Clients

- [ ] Create a new `WorkspaceClient` in `src/models/Workspace/WorkspaceClient.ts`
- [ ] Create a new `WorkspaceMembershipClient` in `src/models/Workspace/WorkspaceMembershipClient.ts`
- [ ] Create a new `UserEmailClient` in `src/models/User/UserEmailClient.ts`

## 5. Frontend Context and Routing

### 5.1 Multi-Session Management

- [ ] Create a session manager to handle multiple authenticated sessions in the browser
- [ ] Implement a way to store and retrieve authentication tokens for different email accounts
- [ ] Add a session selector UI to allow users to switch between authenticated accounts

### 5.2 Auth Context Updates

- [ ] Update `src/context/AuthContext.tsx` to handle multiple authenticated sessions
- [ ] Implement a way to store and retrieve authentication tokens for different email accounts

### 5.3 Workspace Management Components

- [ ] Create workspace management components:
  - `src/components/Workspace/WorkspaceSelector.tsx` - Dropdown for switching workspaces
  - `src/components/Workspace/WorkspaceSettings.tsx` - Form for managing workspace settings
  - `src/components/Workspace/WorkspaceMembersList.tsx` - List of workspace members
  - `src/components/Workspace/InviteMemberForm.tsx` - Form for inviting members

### 5.2 New Routes for Workspace Management

- [ ] Create new routes:
  - `src/routes/workspaces/page.tsx` - List of user's workspaces
  - `src/routes/workspaces/[workspace_id]/page.tsx` - Workspace details
  - `src/routes/workspaces/[workspace_id]/members/page.tsx` - Workspace members management
  - `src/routes/workspaces/[workspace_id]/settings/page.tsx` - Workspace settings

### 5.3 Create Workspace Context

- [ ] Create a workspace context in `src/context/WorkspaceContext.tsx`
- [ ] Add workspace switching functionality to the context

## 6. User Interface Changes

### 6.1 Layout Updates

- [ ] Update `src/components/Layout/AppShell.tsx` to include workspace selection in the sidebar/header
- [ ] Add workspace indicator in `src/components/Layout/Header.tsx`

### 6.2 User Profile Updates

- [ ] Update `src/routes/settings/profile/page.tsx` to show all emails across workspaces
- [ ] Add email management UI in `src/components/User/EmailManagement.tsx`

### 6.3 Onboarding Flow Updates

- [ ] Update `src/routes/onboarding/page.tsx` to include workspace creation

## 7. Authorization and Permissions

### 7.1 Role-Based Access Control

- [ ] Create a permission system in `src/lib/auth/permissions.ts` for workspace roles
- [ ] Implement role checks in relevant components and routes

### 7.2 Frontend Authorization Hooks

- [ ] Create `useWorkspacePermissions` hook in `src/lib/hooks/auth/useWorkspacePermissions.ts`
- [ ] Implement UI permission checks using this hook

## 8. Data Migration

### 8.1 Migration Scripts

- [ ] Create a migration script to move existing data to the multi-tenant schema
- [ ] Create a default workspace for existing users
- [ ] Associate all existing data with the default workspace

### 8.2 Seed Script Updates

- [ ] Update `seed/seedJobs.ts` to include workspace context
- [ ] Update `seed/SeedConfig.ts` to support seeding multiple workspaces

## 9. Testing

### 9.1 Unit Tests

- [ ] Update existing tests to account for workspace context
- [ ] Create new tests for workspace-specific functionality

### 9.2 Integration Tests

- [ ] Create tests for workspace switching functionality
- [ ] Test RLS policies with multiple workspaces

## 10. Documentation

### 10.1 Internal Documentation

- [ ] Update API documentation to include workspace context
- [ ] Document the multi-tenant architecture

### 10.2 User Documentation

- [ ] Create user guides for workspace management
- [ ] Document how to switch between workspaces

## 11. Deployment Considerations

### 11.1 Database Migrations

- [ ] Plan a safe migration strategy for the production database

### 11.2 Feature Flags

- [ ] Consider implementing feature flags in `src/config/featureFlags.ts` for gradual rollout

## 12. Performance Considerations

### 12.1 Indexing

- [ ] Add appropriate indexes on `workspace_id` columns for performance

### 12.2 Caching

- [ ] Update caching strategies in `src/lib/hooks/query/useQuery.ts` to include workspace context in cache keys
