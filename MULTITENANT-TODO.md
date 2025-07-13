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

- [x] When a user logs in, they should be taken to the first workspace page of their workspace list
- [x] "Welcome to your first workspace" page should be impossible for them to reach.
- [ ] When user clicks "Create new workspace" this should open a modal now instead.
- [x] Going to the root URL (previously "Welcome to your first workspace") should now redirect user to the first workspace of their workspace list.
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

- [x] All local datasets should be linked to a workspace
- [x] Only show local datasets that relate to this workspace
- [x] All entity profile configs should be linked to a workspace
- [x] All entity instances and field values should be linked to a workspace
- [x] Entities should only be viewable according to our workspace
- [x] Entity profile configs should only be viewable according to our workspace

### 3.3 Backend clients

- [ ] WorkspaceClient should allow inviting members
- [ ] Inviting a member should send them an email
- [x] Add support for seed data:

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

## 6. User Interface Changes

### 6.1 Layout Updates

- [ ] Update `src/components/Layout/AppShell.tsx` to include workspace selection in the sidebar/header
- [ ] Add workspace indicator in `src/components/Layout/Header.tsx`

### 8. Seed Script Updates

- [x] Update `seed/seedJobs.ts` to include workspace context
- [x] Update `seed/SeedConfig.ts` to support seeding multiple workspaces

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
