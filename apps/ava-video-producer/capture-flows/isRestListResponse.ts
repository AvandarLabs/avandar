import type { Response } from "@playwright/test";

/**
 * Whether a response is the app's successful list request for a table, so a
 * flow can wait for the data a screen renders from it.
 *
 * Use it with `page.waitForResponse` before an action that makes the app
 * fetch a table, for example the dashboards or maps list.
 */
export function isRestListResponse(response: Response, table: string): boolean {
  return (
    new URL(response.url()).pathname.endsWith(`/rest/v1/${table}`) &&
    response.request().method() === "GET" &&
    response.ok()
  );
}
