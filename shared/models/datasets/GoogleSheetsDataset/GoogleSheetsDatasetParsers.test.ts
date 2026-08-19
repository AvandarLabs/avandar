import { GoogleSheetsDatasetParsers } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts";
import { describe, expect, it } from "vitest";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.ts";

/**
 * A Google account id as the database actually stores it.
 * `google-auth-callback` sets `tokens__google.google_account_id` from the OAuth
 * id token's `sub` (`GoogleAuthCallbackRoutes.ts`), and a `sub` is a numeric
 * string of about 21 digits, not a UUID. Every fixture here uses that shape on
 * purpose: the pre-existing `GoogleSheetsImportView` tests used a UUID, which
 * is why a `z.uuid()` on this column survived unnoticed while making every
 * real row unreadable.
 */
const GOOGLE_SUB = "108374652910384756291";

function _dbRow(
  overrides: Partial<GoogleSheetsDataset.T<"DBRead">> = {},
): GoogleSheetsDataset.T<"DBRead"> {
  return {
    created_at: "2026-08-19T00:00:00.000Z",
    dataset_id: "11111111-1111-4111-8111-111111111111",
    google_account_id: GOOGLE_SUB,
    google_document_id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
    id: "22222222-2222-4222-8222-222222222222",
    rows_to_skip: 0,
    sheet_name: null,
    updated_at: "2026-08-19T00:00:00.000Z",
    workspace_id: "33333333-3333-4333-8333-333333333333",
    ...overrides,
  };
}

describe("GoogleSheetsDatasetParsers", () => {
  it("reads a row whose google_account_id is a real Google sub", () => {
    const model = GoogleSheetsDatasetParsers.fromDBReadToModelRead(_dbRow());

    expect(model.googleAccountId).toBe(GOOGLE_SUB);
  });

  it("also reads a row whose google_account_id happens to look like a uuid", () => {
    // Positive control for the test above. Without it, deleting the whole
    // `google_account_id` entry from `DBReadSchema` would pass, and so would a
    // parser that dropped the field entirely.
    const uuidShaped = "44444444-4444-4444-8444-444444444444";
    const model = GoogleSheetsDatasetParsers.fromDBReadToModelRead(
      _dbRow({ google_account_id: uuidShaped }),
    );

    expect(model.googleAccountId).toBe(uuidShaped);
  });

  it("reads a stored tab name", () => {
    const model = GoogleSheetsDatasetParsers.fromDBReadToModelRead(
      _dbRow({ sheet_name: "Q3 data" }),
    );

    expect(model.sheetName).toBe("Q3 data");
  });

  it("keeps a null tab name as null, not undefined", () => {
    // `null` carries the "first tab in the workbook" meaning that every row
    // imported before the column existed relies on, so it has to survive the
    // read as `null`. Collapsing it to `undefined` would make an absent tab
    // indistinguishable from a field the parser forgot.
    const model = GoogleSheetsDatasetParsers.fromDBReadToModelRead(
      _dbRow({ sheet_name: null }),
    );

    expect(model.sheetName).toBeNull();
    expect("sheetName" in model).toBe(true);
  });

  it("still rejects a row that is missing google_document_id", () => {
    // Proves `DBReadSchema` is still being enforced on every read, so the two
    // tests above are not passing because validation was removed wholesale.
    const { google_document_id: _omitted, ...withoutDocumentId } = _dbRow();

    expect(() => {
      return GoogleSheetsDatasetParsers.fromDBReadToModelRead(
        withoutDocumentId as GoogleSheetsDataset.T<"DBRead">,
      );
    }).toThrow();
  });
});
