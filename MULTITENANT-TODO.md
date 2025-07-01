# Multi-tenancy Implementation Plan

This document outlines the step-by-step changes required to implement multi-tenancy in our application with the following requirements:

- Each user can be part of multiple workspaces (tenants)
- Each workspace can have multiple users
- Users can have different email addresses per workspace
- RLS policies must account for tenant ID, not just auth user ID

## 2.1 Supabase Auth Configuration

### 2.2 Sign-Up Flow Changes

- [ ] When a user creates an account, they should be taken to the "Welcome to your first workspace" page
- [ ] The side bar should hide any workspace links while the workspace is being created
- [ ] When a user creates a workspace, they should be taken to that workspace page

### 2.3 Sign-In Flow Changes

- [ ] When a user logs in, they should be taken to the first workspace page of their workspace list
- [ ] "Welcome to your first workspace" page should be impossible for them to reach.
- [ ] When user clicks "Create new workspace" this should open a modal now instead.
- [ ] Going to the root URL (previously "Welcome to your first workspace") should now redirect user to the first workspace of their workspace list.
- [ ] Future: Add ability to maintain multiple authenticated sessions (different email accounts) simultaneously
- [ ] Future: allow switching between workspaces from different authenticated sessions

### 2.4 Joining a workspace

- [ ] Users should be able to accept an invitation
- [ ] When a user accepts an invitation, they should be prompted to authenticate or register.
- [ ] When a user registers, it accepts the invitation and goes to that workspace. No "Welcome to your first workspace" page.
- [ ] When a user authenticates, it goes straight to that new workspace.

## 3. Workspace functionality

### 3.1 UI

- [ ] Workspace name should be visible somewhere
- [ ] Sidebar should now let you switch workspaces

### 3.2 Object creation

- [ ] All local datasets should be linked to a workspace
- [ ] Only show local datasets that relate to this workspace
- [ ] All entity profile configs should be linked to a workspace
- [ ] All entity instances and field values should be linked to a workspace
- [ ] Entities should only be viewable according to our workspace
- [ ] Entity profile configs should only be viewable according to our workspace

### 3.3 Backend clients

- [ ] WorkspaceClient should allow inviting members
- [ ] Inviting a member should send them an email
- [ ] Add support for seed data:
  - 2 workspaces
  - 3 users: 1 admin per workspace, and 1 user in one of the workspaces.

### 5. Future work

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
