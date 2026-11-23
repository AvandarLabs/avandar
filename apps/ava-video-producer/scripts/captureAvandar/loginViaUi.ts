import { CaptureUrlSafety } from "../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import type { CaptureLoginOptions } from "./captureAvandar.types";

/**
 * The default capture login: signs in through the product's own form in an
 * unrecorded context. It runs before any recording, trace, screenshot, or
 * DOM-text artifact exists.
 */
export async function loginViaUi({
  page,
  baseUrl,
  workspace,
  email,
  password,
}: Readonly<CaptureLoginOptions>): Promise<void> {
  await page.goto(`${baseUrl}/signin`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Email(?: \*)?$/).fill(email);
  await page.getByLabel(/^Password(?: \*)?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => {
    return CaptureUrlSafety.isWorkspaceRoute({
      url: url.href,
      baseUrl,
      workspace,
    });
  });
}
