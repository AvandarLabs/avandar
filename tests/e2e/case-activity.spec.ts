import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  deleteSeededCaseRecord,
  seedCaseRecord,
} from "./helpers/seedCaseRecord";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

/**
 * Opens a comment's reaction picker from the keyboard and picks a reaction.
 * The keyboard path opens the picker at once, with no hover delay.
 */
async function pickReaction(options: {
  page: Page;
  reactionButton: Locator;
  reactionLabel: string;
}): Promise<void> {
  const { page, reactionButton, reactionLabel } = options;
  await reactionButton.focus();
  await page.keyboard.press("ArrowDown");
  await page
    .getByRole("group", { name: "Reactions" })
    .getByRole("button", { name: reactionLabel, exact: true })
    .click();
}

test("a member's case update keeps its formatting, mention, reaction, and edit until it is deleted", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let conceptId: string | undefined;
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const seeded = await seedCaseRecord({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      caseTypeName: "E2E measles case",
      recordName: "E2E Amara Okafor",
    });
    conceptId = seeded.conceptId;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await page.goto(
      `/${workspaceSlug}/individual-manager/${seeded.conceptId}/${seeded.individualId}`,
    );
    await expect(page.getByText("No activity on this case yet")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Write with markdown shortcuts and a mention picked from the typeahead.
    // The editing area is a textbox, and a combobox while the @ list is
    // open, so it is located by its label rather than its role.
    const editor = page.getByLabel("Write an update", { exact: true });
    await editor.click();
    await page.keyboard.type("Lab results **pending** for ");
    const emailLocalPart = primaryUser.email.split("@")[0] ?? "";
    await page.keyboard.type(`@${emailLocalPart}`);
    await page
      .getByRole("option")
      .filter({ hasText: primaryUser.email })
      .click();
    await page.keyboard.press("Enter");
    await page.keyboard.type("- Serum for IgM");
    await page.getByRole("button", { name: "Post", exact: true }).click();

    const comment = page
      .getByRole("article")
      .filter({ hasText: "Lab results" });
    await expect(comment).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(
      comment.locator("strong", { hasText: "pending" }),
    ).toBeVisible();
    await expect(comment.locator('[data-type="userMention"]')).toBeVisible();
    await expect(comment.getByRole("listitem")).toHaveText("Serum for IgM");
    await expect(editor).toHaveText("");

    // React with Celebrate, then swap to Like.
    await pickReaction({
      page,
      reactionButton: comment.getByRole("button", {
        name: "Like",
        exact: true,
      }),
      reactionLabel: "Celebrate",
    });
    const celebrateButton = comment.getByRole("button", {
      name: "Celebrate",
      exact: true,
    });
    await expect(celebrateButton).toHaveAttribute("aria-pressed", "true", {
      timeout: MEDIUM_WAIT,
    });
    await pickReaction({
      page,
      reactionButton: celebrateButton,
      reactionLabel: "Like",
    });
    await expect(
      comment.getByRole("button", { name: "Like", exact: true }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: MEDIUM_WAIT });

    // The actions menu offers a link to the comment. The copy itself needs
    // clipboard permissions, so only the item's presence is checked.
    await comment.hover();
    await comment.getByRole("button", { name: "Comment actions" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Copy link to comment" }),
    ).toBeVisible();

    // Edit.
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editEditor = comment.getByLabel("Edit comment", { exact: true });
    await editEditor.click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type(" and NP swab");
    await comment.getByRole("button", { name: "Save", exact: true }).click();
    await expect(comment.getByText("edited", { exact: true })).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(comment.getByRole("listitem")).toHaveText(
      "Serum for IgM and NP swab",
    );

    // Delete.
    await comment.hover();
    await comment.getByRole("button", { name: "Comment actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("This comment was deleted.")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(page.getByText("Lab results")).toHaveCount(0);
  } finally {
    await deleteSeededCaseRecord({ admin, conceptId });
  }
});
