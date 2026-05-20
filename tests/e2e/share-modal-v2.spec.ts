import { test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  createRolesMatrixWithoutApp,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword, switchToWorkspaceUser } from "./helpers/auth";
import {
  deleteDatasetAndShares,
  deleteWorkspaceTagByName,
} from "./helpers/datasetSharingCleanup";
import {
  E2E_SECONDARY_MEMBER_DISPLAY_NAME,
  expectDatasetHiddenInDataManager,
  expectDatasetMetaPageAccessible,
  expectDatasetMetaPageDenied,
  expectDatasetVisibleInDataManager,
  uploadCaliforniaCsvDataset,
} from "./helpers/datasetSharingFlow";
import {
  addShareV2,
  closeShareModalV2,
  expectOwnerRowReadOnly,
  expectSharedWithMeListsResource,
  expectSummaryTextV2,
  openResourceFromSharedWithMe,
  openShareModalV2,
  setGeneralAccessV2,
  toggleRequiresAppAccessV2,
} from "./helpers/datasetSharingFlowV2";
import {
  assignWorkspaceTagToMember,
  createWorkspaceTagViaSettings,
} from "./helpers/workspaceTagsFlow";

/** Display name seeded for the workspace owner profile. */
const OWNER_DISPLAY_NAME = "E2E Test Workspace";

test.describe("Share modal v2: Drive-style flows", () => {
  test("1. Drive-style direct user share grants editor access", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E v2 direct user share";

    let datasetId = "";
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await setGeneralAccessV2(page, "Restricted");
      await addShareV2({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "editor",
      });
      await closeShareModalV2(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectDatasetVisibleInDataManager(page, {
        workspaceSlug,
        datasetName,
      });
      // TODO(rbac): this only verifies read access - editor vs. viewer
      // distinction is not observable at the UI level today because
      // DatasetMetaView renders edit affordances (description editor,
      // Delete button) unconditionally and writes are gated only at RLS.
      // Tighten this when an editor-only control is exposed.
      await expectDatasetMetaPageAccessible(page, {
        workspaceSlug,
        datasetId,
        datasetName,
      });
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });

  test("2. Restricted hides dataset from non-shared viewers", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E v2 restricted";

    let datasetId = "";
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await setGeneralAccessV2(page, "Restricted");
      await closeShareModalV2(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectDatasetHiddenInDataManager(page, {
        workspaceSlug,
        datasetName,
      });
      await expectDatasetMetaPageDenied(page, {
        workspaceSlug,
        datasetId,
      });
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });

  test("3. Intersection ON: only group members with app access can open", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const datasetName = "E2E v2 intersection on";
    const groupName = "E2E Analytics intersection on";

    let datasetId = "";
    // The intersection ON branch strips the secondary user's data_sources
    // app role mid-test so we exercise both halves of the toggle.
    let assignResult: {
      previousRoleGroupId: string | null;
      insertedCustomRoleGroupId: string | null;
    } | null = null;

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await createWorkspaceTagViaSettings({
        page,
        workspaceSlug,
        tagName: groupName,
      });
      await assignWorkspaceTagToMember({
        page,
        workspaceSlug,
        memberDisplayName: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        tagName: groupName,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await setGeneralAccessV2(page, "Restricted");
      await addShareV2({
        page,
        principalLabel: groupName,
        role: "editor",
      });
      await toggleRequiresAppAccessV2({
        page,
        groupLabel: groupName,
        on: true,
      });
      await closeShareModalV2(page);

      // Half 1: secondary user is still a Global Viewer (has data_sources
      // viewer) and is in the Analytics group → editor via the share.
      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      // TODO(rbac): editor capability not verifiable at the UI level
      // today (see DatasetMetaView: all edit affordances render
      // unconditionally). We assert dataset access only.
      await expectDatasetMetaPageAccessible(page, {
        workspaceSlug,
        datasetId,
        datasetName,
      });

      // Half 2: strip data_sources from the secondary user's matrix while
      // they remain in the Analytics group. Intersection ON blocks them.
      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        matrix: createRolesMatrixWithoutApp("data_sources"),
      });

      // Reload so the new app-roles matrix takes effect for this user.
      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectDatasetMetaPageDenied(page, {
        workspaceSlug,
        datasetId,
      });
    } finally {
      if (assignResult) {
        await restoreE2ESecondaryMemberRoleGroup({
          supabaseAdminClient: admin,
          workspaceId,
          viewerUserId,
          ...assignResult,
        });
      }
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
      await deleteWorkspaceTagByName({
        supabaseAdminClient: admin,
        workspaceId,
        tagName: groupName,
      });
    }
  });

  test("4. Intersection OFF: group member without app access opens via Shared with me", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const datasetName = "E2E v2 intersection off";
    const groupName = "E2E Analytics intersection off";

    let datasetId = "";
    // Strip data_sources from the secondary user upfront so the only path
    // to the dataset is through the group share. With intersection OFF
    // they should still reach the dataset, surfaced via Shared with me.
    const assignResult = await assignE2ESecondaryMemberCustomMatrix({
      supabaseAdminClient: admin,
      workspaceId,
      viewerUserId,
      matrix: createRolesMatrixWithoutApp("data_sources"),
    });

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await createWorkspaceTagViaSettings({
        page,
        workspaceSlug,
        tagName: groupName,
      });
      await assignWorkspaceTagToMember({
        page,
        workspaceSlug,
        memberDisplayName: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        tagName: groupName,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await setGeneralAccessV2(page, "Restricted");
      await addShareV2({
        page,
        principalLabel: groupName,
        role: "editor",
      });
      // Intersection OFF by default; toggle just to assert state.
      await toggleRequiresAppAccessV2({
        page,
        groupLabel: groupName,
        on: false,
      });
      await closeShareModalV2(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      // The user has no data_sources role, so the sidebar does not list
      // the dataset directly; but Shared with me does.
      await expectSharedWithMeListsResource({
        page,
        workspaceSlug,
        resourceName: datasetName,
      });
      await openResourceFromSharedWithMe({
        page,
        workspaceSlug,
        resourceName: datasetName,
      });
      // TODO(rbac): editor capability not verifiable at the UI level
      // today (see DatasetMetaView). The card-open path is the assertion;
      // editor-vs-viewer at the share row is covered by the modal unit
      // tests, and write enforcement is exercised by RLS-level tests.
      await expectDatasetMetaPageAccessible(page, {
        workspaceSlug,
        datasetId,
        datasetName,
      });
    } finally {
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        ...assignResult,
      });
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
      await deleteWorkspaceTagByName({
        supabaseAdminClient: admin,
        workspaceId,
        tagName: groupName,
      });
    }
  });

  test("5. Summary sentence reflects mixed configuration", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const datasetName = "E2E v2 summary mixed";
    const groupName = "E2E Summary group";

    let datasetId = "";

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await createWorkspaceTagViaSettings({
        page,
        workspaceSlug,
        tagName: groupName,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);

      // Workspace share: "Anyone in Data Sources" at viewer.
      await setGeneralAccessV2(page, "Workspace", "viewer");

      // Direct user share to the secondary user as editor.
      await addShareV2({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "editor",
      });

      // Direct group share with intersection ON.
      await addShareV2({
        page,
        principalLabel: groupName,
        role: "viewer",
      });
      await toggleRequiresAppAccessV2({
        page,
        groupLabel: groupName,
        on: true,
      });

      // Spec §7.3 / shareSummary.ts: mixed direct, group, and general access.
      await expectSummaryTextV2(page, [
        "This dataset is shared with:",
        E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        "all members of",
        groupName,
        "who also have",
        "Data Sources",
        "anyone with",
        "Viewer",
      ]);

      await closeShareModalV2(page);
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
      await deleteWorkspaceTagByName({
        supabaseAdminClient: admin,
        workspaceId,
        tagName: groupName,
      });
    }
  });

  test("6. Shared with me lists the dataset and the card opens it", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const datasetName = "E2E v2 shared with me";

    let datasetId = "";
    // Strip data_sources from the secondary user so the only path to the
    // dataset is the explicit share: exactly the Shared with me case.
    const assignResult = await assignE2ESecondaryMemberCustomMatrix({
      supabaseAdminClient: admin,
      workspaceId,
      viewerUserId,
      matrix: createRolesMatrixWithoutApp("data_sources"),
    });

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await setGeneralAccessV2(page, "Restricted");
      await addShareV2({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "viewer",
      });
      await closeShareModalV2(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectSharedWithMeListsResource({
        page,
        workspaceSlug,
        resourceName: datasetName,
      });
      await openResourceFromSharedWithMe({
        page,
        workspaceSlug,
        resourceName: datasetName,
      });
    } finally {
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        ...assignResult,
      });
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });

  test("7. Owner row is read-only: Owner badge, no remove button, no role select", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E v2 owner row";

    let datasetId = "";
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      ({ datasetId } = await uploadCaliforniaCsvDataset({
        page,
        workspaceSlug,
        datasetName,
      }));

      await openShareModalV2(page);
      await expectOwnerRowReadOnly({
        page,
        ownerLabel: OWNER_DISPLAY_NAME,
      });
      await closeShareModalV2(page);
    } finally {
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });
});
