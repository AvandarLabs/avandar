import { test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberBuiltinRoleGroup,
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
  restrictDatasetWithNoWorkspaceAccess,
  shareDatasetWithPrincipal,
  uploadCaliforniaCsvDataset,
} from "./helpers/datasetSharingFlow";
import {
  assignWorkspaceTagToMember,
  createWorkspaceTagViaSettings,
} from "./helpers/workspaceTagsFlow";

test.describe("Dataset sharing access", () => {
  test.describe("direct user share", () => {
    test("restricted dataset: viewer denied until owner shares, then allowed", async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
      const { admin } = e2eViewerMembership;
      const datasetName = "E2E CSV share user";

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

        await restrictDatasetWithNoWorkspaceAccess(page);

        await switchToWorkspaceUser(page, {
          email: secondaryUser.email,
          password: secondaryUser.password,
          workspaceSlug,
        });

        await expectDatasetHiddenInDataManager(page, {
          workspaceSlug,
          datasetName,
        });
        await expectDatasetMetaPageDenied(page, { workspaceSlug, datasetId });

        await switchToWorkspaceUser(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });

        await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
        await shareDatasetWithPrincipal({
          page,
          principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
          role: "viewer",
        });

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
  });

  test.describe("restricted blocks non-settings admins", () => {
    test("global editor denied until explicit user share", async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
      const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
      const datasetName = "E2E CSV share restricted editor";

      let datasetId = "";
      const assignResult = await assignE2ESecondaryMemberBuiltinRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        builtinName: "Global Editor",
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

        await restrictDatasetWithNoWorkspaceAccess(page);

        await switchToWorkspaceUser(page, {
          email: secondaryUser.email,
          password: secondaryUser.password,
          workspaceSlug,
        });

        await expectDatasetHiddenInDataManager(page, {
          workspaceSlug,
          datasetName,
        });
        await expectDatasetMetaPageDenied(page, { workspaceSlug, datasetId });

        await switchToWorkspaceUser(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });

        await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
        await shareDatasetWithPrincipal({
          page,
          principalLabel: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
          role: "viewer",
        });

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
  });

  test.describe("user group tag share", () => {
    test("viewer gains access after owner shares dataset with a tag", async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
      const { admin, workspaceId } = e2eViewerMembership;
      const datasetName = "E2E CSV share user tag";
      const tagName = "E2E Share Tag Viewer";

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
          tagName,
        });
        await assignWorkspaceTagToMember({
          page,
          workspaceSlug,
          memberDisplayName: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
          tagName,
        });

        ({ datasetId } = await uploadCaliforniaCsvDataset({
          page,
          workspaceSlug,
          datasetName,
        }));

        await restrictDatasetWithNoWorkspaceAccess(page);

        await switchToWorkspaceUser(page, {
          email: secondaryUser.email,
          password: secondaryUser.password,
          workspaceSlug,
        });

        await expectDatasetHiddenInDataManager(page, {
          workspaceSlug,
          datasetName,
        });
        await expectDatasetMetaPageDenied(page, { workspaceSlug, datasetId });

        await switchToWorkspaceUser(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });

        await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
        await shareDatasetWithPrincipal({
          page,
          principalLabel: tagName,
          role: "viewer",
        });

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
        await deleteWorkspaceTagByName({
          supabaseAdminClient: admin,
          workspaceId,
          tagName,
        });
      }
    });

    test("global editor gains access after owner shares dataset with a tag", async ({
      page,
      e2eWorkerDb,
      e2eViewerMembership,
    }) => {
      const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
      const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
      const datasetName = "E2E CSV share editor tag";
      const tagName = "E2E Share Tag Editor";

      let datasetId = "";
      const assignResult = await assignE2ESecondaryMemberBuiltinRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        builtinName: "Global Editor",
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
          tagName,
        });
        await assignWorkspaceTagToMember({
          page,
          workspaceSlug,
          memberDisplayName: E2E_SECONDARY_MEMBER_DISPLAY_NAME,
          tagName,
        });

        ({ datasetId } = await uploadCaliforniaCsvDataset({
          page,
          workspaceSlug,
          datasetName,
        }));

        await restrictDatasetWithNoWorkspaceAccess(page);

        await switchToWorkspaceUser(page, {
          email: secondaryUser.email,
          password: secondaryUser.password,
          workspaceSlug,
        });

        await expectDatasetHiddenInDataManager(page, {
          workspaceSlug,
          datasetName,
        });
        await expectDatasetMetaPageDenied(page, { workspaceSlug, datasetId });

        await switchToWorkspaceUser(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });

        await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
        await shareDatasetWithPrincipal({
          page,
          principalLabel: tagName,
          role: "viewer",
        });

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
          tagName,
        });
      }
    });
  });
});
