import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isWorkspaceRoute } from "../capture-lib.mjs";

/** Load the workspace flow map a capture run will execute, from capture-flows/avandar.mjs. */
export async function loadFlows(root) {
  const module = await import(
    pathToFileURL(join(resolve(root), "capture-flows", "avandar.mjs")).href
  );
  if (!module.flows || typeof module.flows !== "object")
    throw new Error("capture-flows/avandar.mjs must export a flows map");
  return module.flows;
}

/** Login happens before any recording, trace, screenshot, or DOM-text artifact. */
export async function loginViaUi({
  page,
  baseUrl,
  workspace,
  email,
  password,
}) {
  await page.goto(`${baseUrl}/signin`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Email(?: \*)?$/).fill(email);
  await page.getByLabel(/^Password(?: \*)?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) =>
    isWorkspaceRoute(url.href, baseUrl, workspace),
  );
}
