import { EtlTransientStoreError } from "@etl/stores/EtlTransientStoreError";
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import { describe, expect, it } from "vitest";

const CLOUDFLARE_520_PAGE = `<!DOCTYPE html>
<html class="no-js" lang="en-US">
<head>
<title>supabase.co | 520: Web server is returning an unknown error</title>
</head>
<body><div id="cf-wrapper">...</div></body>
</html>`;

function _catchError(
  args: Parameters<typeof throwOnSupabaseError>[0],
): unknown {
  try {
    throwOnSupabaseError(args);
  } catch (error: unknown) {
    return error;
  }
  return undefined;
}

describe("throwOnSupabaseError", () => {
  it("does nothing when the request succeeded", () => {
    expect(
      _catchError({ error: null, status: 200, action: "reading rows" }),
    ).toBeUndefined();
  });

  it("marks a failure a later attempt can succeed at as transient", () => {
    const failures = [
      { status: 0, code: "" },
      { status: 408, code: "" },
      { status: 429, code: "" },
      { status: 500, code: "57014" },
      { status: 503, code: "PGRST000" },
      { status: 520, code: "" },
      { status: 400, code: "55P03" },
      { status: 400, code: "40P01" },
      { status: undefined, code: "08006" },
    ];

    expect(
      failures.map(({ status, code }) => {
        return (
          _catchError({
            error: { message: "failed", code },
            status,
            action: "writing rows",
          }) instanceof EtlTransientStoreError
        );
      }),
    ).toEqual(
      failures.map(() => {
        return true;
      }),
    );
  });

  it("does not mark a failure that would fail again as transient", () => {
    const failures = [
      { status: 400, code: "P0001" },
      { status: 409, code: "23505" },
      { status: 403, code: "42501" },
      { status: 404, code: "PGRST202" },
      { status: undefined, code: undefined },
    ];

    expect(
      failures.map(({ status, code }) => {
        const error = _catchError({
          error: { message: "failed", code },
          status,
          action: "writing rows",
        });
        return [
          error instanceof Error,
          error instanceof EtlTransientStoreError,
        ];
      }),
    ).toEqual(
      failures.map(() => {
        return [true, false];
      }),
    );
  });

  it("names the action, Supabase's message and code, and keeps the status and code", () => {
    const error = _catchError({
      error: {
        message: "canceling statement due to statement timeout",
        code: "57014",
      },
      status: 500,
      action: "upserting listings with upsert_fn",
    });

    expect(error).toMatchObject({
      message:
        "Supabase failed upserting listings with upsert_fn: canceling statement due to statement timeout (code 57014)",
      status: 500,
      code: "57014",
    });
  });

  it("summarizes an HTML error page by its title", () => {
    const error = _catchError({
      error: { message: CLOUDFLARE_520_PAGE },
      status: 520,
      action: "upserting listings with upsert_fn",
    });

    expect((error as Error).message).toBe(
      "Supabase failed upserting listings with upsert_fn: HTTP 520: supabase.co | 520: Web server is returning an unknown error",
    );
  });
});
