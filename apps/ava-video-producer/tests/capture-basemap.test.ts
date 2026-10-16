import assert from "node:assert/strict";
import test from "node:test";
import { requestPolicy } from "../scripts/capture-lib.mjs";

test("the observed suffixless basemap style is readonly and narrowly allowed", () => {
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/planet",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/planet",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/account",
      method: "GET",
    }).allow,
    false,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.openfreemap.org/styles/bright",
      resourceType: "document",
    }).allow,
    false,
  );
});
