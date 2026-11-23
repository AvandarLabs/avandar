import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { postgresConnectorImportErrorCopy } from "@/views/DataManagerApp/copy/postgresConnectorImportErrorCopy/postgresConnectorImportErrorCopy";
import type { ConnectorErrorCode } from "@sbfn/connectors/Connector";

describe("postgresConnectorImportErrorCopy", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("returns the specific copy for a known code", () => {
    expect(
      postgresConnectorImportErrorCopy({ code: "auth_failed", i18n }).title,
    ).toBe("Authentication failed");
  });

  it("falls back to the generic copy, rather than throwing, for a code it does not know", () => {
    // Any thrown error with a `code` property reaches this function, such as
    // a browser `DOMException`, so the code is not always a connector one.
    const unexpectedCode = "ABORT_ERR" as ConnectorErrorCode;

    expect(
      postgresConnectorImportErrorCopy({ code: unexpectedCode, i18n }).title,
    ).toBe("Could not connect to the database");
  });
});
