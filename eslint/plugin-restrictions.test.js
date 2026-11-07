import { APPROVED_PLUGIN_DEPENDENCIES } from "@plugin-manifest/dependencies/getUnapprovedDependenciesFromPackageJson.ts";
import { describe, expect, it } from "vitest";
import {
  APPROVED_PLUGIN_IMPORT_PATTERNS,
  UNAPPROVED_PLUGIN_IMPORT_REGEX,
} from "./plugin-restrictions.js";

const RELATIVE_PATTERN = "\\.{1,2}/";
const JSX_RUNTIME_PATTERN = "react/jsx-runtime$";

/** Mirrors how ESLint compiles a `no-restricted-imports` `regex` option. */
const unapprovedImportRegex = new RegExp(UNAPPROVED_PLUGIN_IMPORT_REGEX, "u");

function isImportRestricted(specifier) {
  return unapprovedImportRegex.test(specifier);
}

/**
 * Package names the ESLint allowlist admits, with the regex anchors and the
 * `date-fns` subpath group removed. Relative files and the JSX runtime are
 * not npm dependencies, so they are left out.
 */
function getPackageNamesFromAllowlist() {
  return APPROVED_PLUGIN_IMPORT_PATTERNS.filter((pattern) => {
    return pattern !== RELATIVE_PATTERN && pattern !== JSX_RUNTIME_PATTERN;
  })
    .map((pattern) => {
      return pattern.replace("(/.*)?$", "").replace(/\$$/, "");
    })
    .sort();
}

describe("plugin import allowlist", () => {
  it("admits exactly the approved plugin dependencies", () => {
    expect(getPackageNamesFromAllowlist()).toEqual(
      [...APPROVED_PLUGIN_DEPENDENCIES].sort(),
    );
  });

  it.each(APPROVED_PLUGIN_DEPENDENCIES)(
    "lets a plugin import the approved package %s",
    (packageName) => {
      expect(isImportRestricted(packageName)).toBe(false);
    },
  );

  it.each([
    "./helpers",
    "../shared/helpers",
    "react/jsx-runtime",
    "date-fns/format",
  ])("lets a plugin import %s", (specifier) => {
    expect(isImportRestricted(specifier)).toBe(false);
  });

  it.each([
    "@/utils/Logger",
    "$/models/User/User",
    "@avandar/utils",
    "@avandar/plugin-sdk/internal",
    "@mantine/core",
    "react-dom",
    "react/jsx-dev-runtime",
    "date-fns-tz",
    "lodash",
    "vitest",
  ])("stops a plugin from importing %s", (specifier) => {
    expect(isImportRestricted(specifier)).toBe(true);
  });
});
