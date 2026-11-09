import { describe, expect, it } from "vitest";
import { failureToInvalidDatasetReason } from "$/connectors/open-data/failureToInvalidDatasetReason/failureToInvalidDatasetReason.ts";
import type { OpenDataAcquisitionFailure } from "$/connectors/open-data/openDataErrors.ts";

const RESOURCE = { ckanResourceId: "r1" };

describe("failureToInvalidDatasetReason", () => {
  it.each<[OpenDataAcquisitionFailure, string]>([
    [{ code: "resource-empty", ...RESOURCE }, "empty_dataset"],
    [{ code: "resource-not-found", ...RESOURCE }, "dataset_not_found"],
    [
      { code: "resource-authorization-required", ...RESOURCE },
      "authorization_required",
    ],
    [
      { code: "ckan-authorization-required", action: "package_show" },
      "authorization_required",
    ],
    [
      { code: "resource-is-remote-api", urlType: "api", ...RESOURCE },
      "unsupported_format",
    ],
    [
      { code: "resource-format-unsupported", format: "ZIP", ...RESOURCE },
      "unsupported_format",
    ],
    [
      {
        code: "resource-format-changed",
        format: "XLSX",
        expectedFormat: "CSV",
        ...RESOURCE,
      },
      "unsupported_format",
    ],
    [
      {
        code: "resource-host-mismatch",
        resourceHost: "example.org",
        expectedHost: "data.humdata.org",
        ...RESOURCE,
      },
      "external_host",
    ],
    [{ code: "resource-unreachable", ...RESOURCE }, "unreachable_dataset"],
  ])("marks %o as %s", (failure, expectedReason) => {
    expect(failureToInvalidDatasetReason(failure)).toBe(expectedReason);
  });

  it.each<[OpenDataAcquisitionFailure]>([
    [{ code: "ckan-unreachable", action: "package_show" }],
    [
      {
        code: "ckan-action-failed",
        action: "package_show",
        ckanErrorType: "Validation Error",
      },
    ],
    [{ code: "socrata-unreachable", socrataDatasetId: "erm2-nwe9" }],
    [{ code: "access-shape-invalid", accessKind: "api_resource" }],
    [{ code: "freshness-probe-invalid", problem: "path-missing" }],
  ])(
    "leaves the listing valid for %o, which says nothing about the dataset",
    (failure) => {
      expect(failureToInvalidDatasetReason(failure)).toBeUndefined();
    },
  );
});
