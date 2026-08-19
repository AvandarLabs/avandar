import { isRedirect, redirect } from "@sbfn/_shared/MiniServer/redirect.ts";
import { describe, expect, it } from "vitest";

const APP_URL = "http://localhost:5173/data";

/**
 * MiniServer's `isRedirect` gate, which turns `throw redirect(url)` into an
 * HTTP 302. The edge runtime's `Response` is not `instanceof Response` against
 * the constructor this module sees, so recognition cannot depend on that check.
 */
describe("isRedirect", () => {
  it("recognizes a redirect whose Response fails instanceof", () => {
    const native = redirect(APP_URL);
    const otherRealmResponse = Object.assign(Object.create(null), {
      status: native.response.status,
      headers: native.response.headers,
    });
    const thrown = { type: "redirect", response: otherRealmResponse };

    expect(otherRealmResponse instanceof Response).toBe(false);
    expect(isRedirect(thrown)).toBe(true);
  });

  it("still recognizes redirect() from this realm", () => {
    const thrown = redirect(APP_URL);

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown.response.headers.get("Location")).toBe(APP_URL);
  });

  it("rejects a 302 that is not a MiniServer redirect", () => {
    expect(
      isRedirect({
        type: "error",
        response: new Response(null, {
          status: 302,
          headers: { Location: APP_URL },
        }),
      }),
    ).toBe(false);
  });
});
