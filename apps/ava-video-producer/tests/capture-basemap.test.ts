import assert from "node:assert/strict";
import test from "node:test";
import { getRequestDecisionFromRequest } from "../scripts/captureLib/urlSafetyHelpers";

test("the observed suffixless basemap style is readonly and narrowly allowed", () => {
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/planet",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/planet",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/account",
      method: "GET",
    }).allow,
    false,
  );
  assert.equal(
    getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      resourceType: "document",
    }).allow,
    false,
  );
});
