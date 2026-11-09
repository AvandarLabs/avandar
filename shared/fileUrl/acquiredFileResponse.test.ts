import { describe, expect, it } from "vitest";
import { acquiredFileResponse } from "$/fileUrl/acquiredFileResponse.ts";

const CSV = new TextEncoder().encode("a,b\n1,2\n");

describe("acquiredFileResponse", () => {
  it("returns the file bytes and the name the upload page should show", async () => {
    const response = acquiredFileResponse({
      outcome: "file",
      fileName: "Main Routine.csv",
      mediaType: "text/csv",
      bytes: CSV,
      sourceLabel: "GitHub",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Ava-Outcome")).toBe("file");
    expect(decodeURIComponent(response.headers.get("X-Ava-File-Name") ?? "")).toBe(
      "Main Routine.csv",
    );
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(
      Array.from(CSV),
    );
  });

  it("returns a choice as JSON and a refusal with its status", async () => {
    const choice = acquiredFileResponse({
      outcome: "choice",
      sourceLabel: "GitHub",
      members: [
        { path: "a.csv", size: 4, mediaType: "text/csv" },
        { path: "b.csv", size: 5, mediaType: "text/csv" },
      ],
    });
    expect(choice.status).toBe(200);
    await expect(choice.json()).resolves.toMatchObject({ outcome: "choice" });

    const tooLarge = acquiredFileResponse({
      outcome: "error",
      reason: "too-large",
    });
    expect(tooLarge.status).toBe(413);

    const sheet = acquiredFileResponse({
      outcome: "error",
      reason: "google-sheet",
    });
    expect(sheet.status).toBe(400);
    await expect(sheet.json()).resolves.toEqual({
      outcome: "error",
      reason: "google-sheet",
    });
  });
});
