/*
 * The long-function allowlist only shrinks. It names the renderer functions
 * that were already over 45 lines when the function length rule
 * (`eslint/video-producer-function-length.js`) arrived. ESLint reports any
 * entry whose function now fits, and these checks keep the file tidy and
 * stop it from growing past the size it was generated at.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import rendererGlobs from "../videoTheme/themeLiterals/rendererGlobs.json";
import {
  APP_ROOT,
  isFileMatchedByGlobs,
} from "../videoTheme/themeLiterals/rendererFiles/rendererFiles";
import allowlist from "./longFunctionAllowlist.json";

/**
 * The allowlist's size when it was generated. Lower it as entries are
 * removed; never raise it. A new long function is split into helpers.
 */
const ALLOWLIST_CEILING = 289;

function _fileOf(key: string): string {
  return key.slice(0, key.indexOf("#"));
}

test("the long-function allowlist never grows", () => {
  assert.ok(
    allowlist.length <= ALLOWLIST_CEILING,
    `${allowlist.length} entries; split new long functions into helpers`,
  );
});

test("the long-function allowlist is sorted and has no duplicates", () => {
  assert.deepEqual(allowlist, [...new Set(allowlist)].sort());
});

test("every allowlisted function is in an existing renderer file", () => {
  assert.deepEqual(
    allowlist.filter((key) => {
      const file = _fileOf(key);
      return (
        !key.includes("#") ||
        !isFileMatchedByGlobs(rendererGlobs, file) ||
        !fs.existsSync(path.join(APP_ROOT, file))
      );
    }),
    [],
  );
});
