import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { REVIEW_FIXTURES } from "../ComputeCapacityConsolidation.reviewFixtures";
import { makeJobTransfersFromInput } from "../makeJobTransfersFromInput";
import {
  _render,
  _getJobs,
  _assertClear,
  _getBoundaryFrame,
} from "./ComputeCapacityConsolidationTestHelpers";

test("fractional route boundaries preserve continuous full-rectangle clearance", () => {
  const input = REVIEW_FIXTURES.find(
    ({ id }) => id === "fractional-full-stack",
  )!.input;
  const plan = makeJobTransfersFromInput(input);
  const held = _getJobs({ frame: 48, input });
  const final = _getJobs({ frame: 150, input });
  const captions = [
    ..._render({ frame: 48, input: input }).matchAll(
      /<text[^>]* y="366"[^>]*>(.*?)<\/text>/g,
    ),
  ].map(([attributes]) => ({
    x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
    y: 354,
    width: 65,
    height: 32,
  }));
  let distance = 0;
  plan.transfers.forEach((transfer) => {
    const job = held[transfer.index];
    assert.deepEqual(transfer.points[0], { x: job.x, y: job.y });
    const endpoint = transfer.points.at(-1)!;
    assert.ok(Math.abs(endpoint.x - final[transfer.index].x) < 1e-10);
    assert.ok(Math.abs(endpoint.y - final[transfer.index].y) < 1e-10);
    transfer.points.forEach((point, index) => {
      if (index) {
        const prior = transfer.points[index - 1];
        assert.ok(point.x === prior.x || point.y === prior.y);
        const swept = {
          x: Math.min(prior.x, point.x),
          y: Math.min(prior.y, point.y),
          width: 80 + Math.abs(point.x - prior.x),
          height: job.height + Math.abs(point.y - prior.y),
        };
        [
          ...held.filter((_, jobIndex) => jobIndex !== transfer.index),
          ...captions,
        ].forEach((obstacle) => _assertClear({ rectangle: swept, obstacle }));
        distance += Math.abs(point.x - prior.x) + Math.abs(point.y - prior.y);
      }
      const boundary = _getBoundaryFrame(distance / plan.totalLength);
      const before = _getJobs({ frame: boundary - 1e-7, input });
      const after = _getJobs({ frame: boundary + 1e-7, input });
      before.forEach((rectangle, jobIndex) => {
        assert.ok(Math.abs(rectangle.x - after[jobIndex].x) < 0.001);
        assert.ok(Math.abs(rectangle.y - after[jobIndex].y) < 0.001);
        after
          .slice(jobIndex + 1)
          .forEach((other) =>
            _assertClear({ rectangle: after[jobIndex], obstacle: other }),
          );
        captions.forEach((caption) =>
          _assertClear({ rectangle: after[jobIndex], obstacle: caption }),
        );
      });
      assert.ok(Math.abs(after[transfer.index].x - point.x) < 0.01);
      assert.ok(Math.abs(after[transfer.index].y - point.y) < 0.01);
    });
    held[transfer.index] = final[transfer.index];
  });
});
