import {
  expect,
  type APIRequestContext,
  type Page,
  type Locator,
} from "@playwright/test";
import { stockRequestSchema } from "../../../src/stock/contracts/stockRequestSchema/stockRequestSchema";

/** Fetches every stylesheet the Atlas page links and expects CSS back. */
async function _expectAtlasStylesheetsServed(
  request: APIRequestContext,
): Promise<void> {
  const atlasPage = await request.get("/motion.html");
  const stylesheets = [
    ...(await atlasPage.text()).matchAll(
      /<link rel="stylesheet"[^>]*href="([^"]+)"/g,
    ),
  ].map((match) => {
    return match[1];
  });
  expect(stylesheets.length).toBeGreaterThan(0);
  await Promise.all(
    stylesheets.map(async (href) => {
      const stylesheet = await request.get(href);
      expect(stylesheet.ok()).toBe(true);
      expect(stylesheet.headers()["content-type"]).toContain("text/css");
    }),
  );
}

async function _openTradeoffContentEditor(
  page: Page,
): Promise<Readonly<{ dialog: Locator; content: Locator }>> {
  await page.goto("/motion.html");
  await page
    .getByRole("searchbox", { name: "Search motions" })
    .fill("tradeoff-pivot");
  await page
    .getByRole("button", {
      name: "Explore A choice has two sides",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  const content = dialog.getByRole("region", { name: "Content", exact: true });
  return { dialog, content };
}

async function _fillAuthoredWhitespace({
  content,
  authoredApproach,
  authoredPriority,
  authoredGain,
}: Readonly<{
  content: Locator;
  authoredApproach: string;
  authoredPriority: string;
  authoredGain: string;
}>): Promise<void> {
  await content
    .getByRole("textbox", { name: "approach", exact: true })
    .fill(authoredApproach);
  await content
    .getByRole("textbox", { name: "priorityStatement", exact: true })
    .fill(authoredPriority);
  await content
    .getByRole("textbox", { name: "label", exact: true })
    .first()
    .fill(authoredGain);
}

async function _openDecisionForkEditor(
  page: Page,
): Promise<Readonly<{ opener: Locator; dialog: Locator; content: Locator }>> {
  await expect(
    page.getByRole("button", {
      name: "Play all animations",
    }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", {
      name: "Search motions",
    })
    .fill("decision-fork");
  const opener = page.getByRole("button", {
    name: "Explore Choose one branch",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", {
      name: "Play preview",
      exact: true,
    }),
  ).toBeVisible();
  const content = dialog.getByRole("region", {
    name: "Content",
    exact: true,
  });
  await expect(content).toHaveAttribute("class", /\S+/);
  await expect(content).toHaveCSS("border-top-style", "solid");
  return { opener, dialog, content };
}

async function _fillDecisionForkText(content: Locator): Promise<void> {
  await content
    .getByRole("textbox", {
      name: "Decision prompt",
      exact: true,
    })
    .fill("Which path fits this request?");
  await content
    .getByRole("textbox", {
      name: "Condition",
      exact: true,
    })
    .nth(0)
    .fill("Needs review");
  await content
    .getByRole("textbox", {
      name: "Outcome",
      exact: true,
    })
    .nth(0)
    .fill("Send to reviewer");
  await content
    .getByRole("textbox", {
      name: "Condition",
      exact: true,
    })
    .nth(1)
    .fill("Ready for release");
  await content
    .getByRole("textbox", {
      name: "Outcome",
      exact: true,
    })
    .nth(1)
    .fill("Publish approved work");
}

async function _assertConfiguredBranchPreview({
  content,
  dialog,
}: Readonly<{ content: Locator; dialog: Locator }>): Promise<void> {
  await content
    .getByRole("combobox", {
      name: "Selected branch",
      exact: true,
    })
    .selectOption({ label: "Ready for release" });
  await dialog
    .getByRole("slider", {
      name: "Preview frame",
    })
    .press("Home");
  await dialog
    .getByRole("slider", {
      name: "Preview frame",
    })
    .press("PageUp");
  await expect(dialog.getByRole("img")).toContainText("Publish approved work");
}

async function _assertInvalidSelectedBranch({
  content,
  dialog,
}: Readonly<{ content: Locator; dialog: Locator }>): Promise<void> {
  await content
    .getByRole("button", {
      name: "Remove Branches item 2",
      exact: true,
    })
    .click();
  await expect(
    content.getByRole("combobox", {
      name: "Selected branch",
    }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    dialog.getByRole("button", {
      name: "Download MP4",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "Copy configured JSON",
    }),
  ).toBeDisabled();
  await expect(
    content.getByText("selectedBranchId", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByRole("img")).toContainText("Publish approved work");
}

async function _assertContentResetAndDialogFocus({
  page,
  dialog,
  content,
  opener,
}: Readonly<{
  page: Page;
  dialog: Locator;
  content: Locator;
  opener: Locator;
}>): Promise<void> {
  await content
    .getByRole("button", {
      name: "Reset content",
      exact: true,
    })
    .click();
  await expect(
    content.getByRole("textbox", {
      name: "Decision prompt",
    }),
  ).toHaveValue("Where does the fictional sketch belong?");
  await expect(
    content.getByRole("textbox", {
      name: "Condition",
      exact: true,
    }),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
}

/** The intercepted download URL and its latest route payload. */
type DecisionForkTransport = {
  contentTransportUrl: string;
  getDownloadPayload: () => unknown;
};

/** Browser fixtures used to intercept a configured decision-fork download. */
type DecisionForkTransportOptions = {
  page: Page;
  request: APIRequestContext;
};

/** Captures copied editor JSON without accessing the system clipboard. */
async function _installClipboardCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          Reflect.set(window, "copiedMotionJson", value);
        },
      },
    });
  });
}

async function _prepareDecisionForkTransport(
  options: Readonly<DecisionForkTransportOptions>,
): Promise<Readonly<DecisionForkTransport>> {
  const { page, request } = options;
  await _installClipboardCapture(page);
  await _expectAtlasStylesheetsServed(request);
  let downloadPayload: unknown;
  let contentTransportUrl = "";
  await page.route("**/api/exports", async (route) => {
    downloadPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "complete",
        download: contentTransportUrl,
        message: "Test download ready",
      }),
    });
  });
  await page.emulateMedia({
    reducedMotion: "reduce",
  });
  await page.goto("/motion.html");
  contentTransportUrl = await page.evaluate(() => {
    return URL.createObjectURL(
      new Blob(["intercepted transport"], { type: "video/mp4" }),
    );
  });
  expect(
    await page.evaluate(() => {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    }),
  ).toBe(true);
  return {
    contentTransportUrl,
    getDownloadPayload: () => {
      return downloadPayload;
    },
  };
}

/** Browser steps shared by the motion content editor contract. */
export const MotionContentEditorSteps = {
  /** Open tradeoff content editor through the browser. */
  openTradeoffContentEditor: _openTradeoffContentEditor,
  /** Fill authored whitespace through the browser. */
  fillAuthoredWhitespace: _fillAuthoredWhitespace,
  /** Open decision fork editor through the browser. */
  openDecisionForkEditor: _openDecisionForkEditor,
  /** Fill decision fork text through the browser. */
  fillDecisionForkText: _fillDecisionForkText,
  /** Assert configured branch preview through the browser. */
  assertConfiguredBranchPreview: _assertConfiguredBranchPreview,
  /** Assert invalid selected branch through the browser. */
  assertInvalidSelectedBranch: _assertInvalidSelectedBranch,
  /** Assert content reset and dialog focus through the browser. */
  assertContentResetAndDialogFocus: _assertContentResetAndDialogFocus,
  /** Prepare decision fork transport through the browser. */
  prepareDecisionForkTransport: _prepareDecisionForkTransport,

  /** Copies the selected branch and checks the configured request. */
  copySelectedDecisionFork: _copySelectedDecisionFork,
};

async function _copySelectedDecisionFork({
  page,
  dialog,
  content,
}: Readonly<{ page: Page; dialog: Locator; content: Locator }>): Promise<
  Readonly<{
    copied: Extract<
      ReturnType<typeof stockRequestSchema.parse>,
      { preset: "decision-fork" }
    >;
  }>
> {
  await content
    .getByRole("combobox", {
      name: "Selected branch",
    })
    .selectOption({ label: "Needs review" });
  await dialog
    .getByRole("button", {
      name: "Copy configured JSON",
    })
    .click();
  const copied = await page.evaluate(() => {
    return JSON.parse(String(Reflect.get(window, "copiedMotionJson")));
  });
  expect(stockRequestSchema.parse(copied)).toEqual(copied);
  expect(copied.input.branches).toHaveLength(2);
  expect(copied.input.branches[0].condition).toBe("Needs review");
  expect(copied.input.selectedBranchId).toBe("rough");
  return { copied };
}
