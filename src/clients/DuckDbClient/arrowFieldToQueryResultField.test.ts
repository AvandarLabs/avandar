import * as arrow from "apache-arrow";
import { describe, expect, it, vi } from "vitest";
import { arrowFieldToQueryResultField } from "@/clients/DuckDbClient/arrowFieldToQueryResultField";
import type { ILogger } from "@avandar/logger";

function _createLogger(): ILogger & { error: ReturnType<typeof vi.fn> } {
  return { error: vi.fn() } as unknown as ILogger & {
    error: ReturnType<typeof vi.fn>;
  };
}

describe("arrowFieldToQueryResultField", () => {
  it("reads an ordered column's dictionary-encoded labels as text, without an error", () => {
    // DuckDB-WASM sends an ENUM column as Dictionary<Uint8, Utf8>, and as
    // Dictionary<Uint16, Utf8> past 255 labels.
    const logger = _createLogger();
    const field = new arrow.Field(
      "SES",
      new arrow.Dictionary(new arrow.Utf8(), new arrow.Uint8()),
    );

    expect(arrowFieldToQueryResultField(field, { logger })).toEqual({
      name: "SES",
      dataType: "varchar",
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("still reports a dictionary of something other than text", () => {
    const logger = _createLogger();
    const field = new arrow.Field(
      "codes",
      new arrow.Dictionary(new arrow.Int32(), new arrow.Uint8()),
    );

    expect(arrowFieldToQueryResultField(field, { logger }).dataType).toBe(
      "varchar",
    );
    expect(logger.error).toHaveBeenCalledWith("Unhandleable arrow type", {
      typeId: arrow.Type.Dictionary,
    });
  });
});
