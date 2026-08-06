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
  addShare,
  closeShareModal,
  expectOwnerRowReadOnly,
  expectShareSummaryText,
  openShareModal,
  setGeneralAccess,
  toggleRequiresAppAccess,
} from "./helpers/shareModalFlow";
import {
  assignWorkspaceTagToMember,
  createWorkspaceTagViaSettings,
} from "./helpers/workspaceTagsFlow";

const OWNER_DISPLAY_NAME = "E2E Test Workspace";

test.describe("Share modal", () => {
  test("direct user share grants access to the dataset", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E direct user share";

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

      await openShareModal(page);
      await setGeneralAccess(page, "Restricted");
      await addShare({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "editor",
      });
      await closeShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectDatasetVisibleInDataManager(page, {
        workspaceSlug,
        datasetName,
      });
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

  test("restricted general access hides the dataset from non-shared members", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E restricted";

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

      await openShareModal(page);
      await setGeneralAccess(page, "Restricted");
      await closeShareModal(page);

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

  test("group share with app-access intersection requires Data Sources access", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const datasetName = "E2E intersection on";
    const groupName = "E2E Analytics intersection on";

    let datasetId = "";
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

      await openShareModal(page);
      await setGeneralAccess(page, "Restricted");
      await addShare({
        page,
        principalLabel: groupName,
        role: "editor",
      });
      await toggleRequiresAppAccess({
        page,
        groupLabel: groupName,
        on: true,
      });
      await closeShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expectDatasetMetaPageAccessible(page, {
        workspaceSlug,
        datasetId,
        datasetName,
      });

      assignResult = await assignE2ESecondaryMemberCustomMatrix({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        matrix: createRolesMatrixWithoutApp("data_sources"),
      });

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

  test("group share without app-access intersection grants deep-route access", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const datasetName = "E2E intersection off";
    const groupName = "E2E Analytics intersection off";

    let datasetId = "";
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

      await openShareModal(page);
      await setGeneralAccess(page, "Restricted");
      await addShare({
        page,
        principalLabel: groupName,
        role: "editor",
      });
      await toggleRequiresAppAccess({
        page,
        groupLabel: groupName,
        on: false,
      });
      await closeShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

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

  test("summary line reflects workspace, user, and group shares", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const datasetName = "E2E summary mixed";
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

      await openShareModal(page);
      await setGeneralAccess(page, "Workspace", "viewer");
      await addShare({
        page,
        principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        role: "editor",
      });
      await addShare({
        page,
        principalLabel: groupName,
        role: "viewer",
      });
      await toggleRequiresAppAccess({
        page,
        groupLabel: groupName,
        on: true,
      });

      await expectShareSummaryText(page, [
        "This dataset is shared with:",
        E2E_SECONDARY_MEMBER_DISPLAY_NAME,
        "all members of",
        groupName,
        "who also have",
        "Data Sources",
        "anyone with",
        "Viewer",
      ]);

      await closeShareModal(page);
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

  test("owner row is read-only in the people-with-access list", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin } = e2eViewerMembership;
    const datasetName = "E2E owner row";

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

      await openShareModal(page);
      await expectOwnerRowReadOnly({
        page,
        ownerLabel: OWNER_DISPLAY_NAME,
      });
      await closeShareModal(page);
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
