import assert from "node:assert/strict";
import test from "node:test";
import { CaptureUrlSafety } from "../CaptureUrlSafety";

test("the observed suffixless basemap style is readonly and narrowly allowed", () => {
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/planet",
      method: "GET",
    }).allow,
    true,
  );
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/planet",
      method: "POST",
    }).allow,
    false,
  );
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/account",
      method: "GET",
    }).allow,
    false,
  );
  assert.equal(
    CaptureUrlSafety.getRequestDecisionFromRequest({
      url: "https://tiles.openfreemap.org/styles/bright",
      resourceType: "document",
    }).allow,
    false,
  );
});
