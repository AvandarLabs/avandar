import { describe, expect, it } from "vitest";

import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";

/**
 * The shape supabase-js throws from `.throwOnError()`: a `PostgrestError`,
 * which is an `Error` subclass carrying the four fields PostgREST puts in the
 * JSON body. Reproduced literally rather than imported so this test would fail
 * if the client library stopped forwarding `hint`.
 */
function makePostgrestError(
  fields: Readonly<{
    code: string;
    message: string;
    details: string | null;
    hint: string | null;
  }>,
): Error {
  return Object.assign(new Error(fields.message), {
    name: "PostgrestError",
    code: fields.code,
    details: fields.details,
    hint: fields.hint,
  });
}

describe("isShareableDashboardLimitError", () => {
  it("recognises the entitlement trigger's rejection", () => {
    expect(
      isShareableDashboardLimitError(
        makePostgrestError({
          code: "42501",
          message:
            "This workspace's plan allows 1 shared or public dashboard(s)",
          details: null,
          hint: "shareable_dashboard_limit",
        }),
      ),
    ).toBe(true);
  });

  it("does not recognise another policy that raises the same SQLSTATE", () => {
    expect(
      isShareableDashboardLimitError(
        makePostgrestError({
          code: "42501",
          message: "Only workspace admins can publish a dashboard publicly",
          details: null,
          hint: null,
        }),
      ),
    ).toBe(false);
  });

  // The message is deliberately NOT part of the match, so a reword of the copy
  // must not change the verdict in either direction.
  it("ignores the message text", () => {
    expect(
      isShareableDashboardLimitError(
        makePostgrestError({
          code: "42501",
          message: "some future rewording of the limit copy",
          details: null,
          hint: "shareable_dashboard_limit",
        }),
      ),
    ).toBe(true);
  });

  it("returns false for a plain error and for non-objects", () => {
    expect(isShareableDashboardLimitError(new Error("Share failed"))).toBe(
      false,
    );
    expect(isShareableDashboardLimitError(undefined)).toBe(false);
    expect(isShareableDashboardLimitError(null)).toBe(false);
    expect(isShareableDashboardLimitError("shareable_dashboard_limit")).toBe(
      false,
    );
  });
});
