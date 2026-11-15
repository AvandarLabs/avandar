import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import {
  CHANGED_INPUT,
  fixtures,
} from "../ComputeCapacityConsolidation.fixtures";
import { REVIEW_FIXTURES } from "../ComputeCapacityConsolidation.reviewFixtures";
import { inputSchema } from "../ComputeCapacityConsolidation.schema";
import { findJobRoute } from "../findJobRoute";
import { transferStressFixtures } from "../transferStressFixtures";
import {
  _render,
  options,
  _getJobs,
} from "./ComputeCapacityConsolidationTestHelpers";

test("changed authored quantities reach their visible conserved destination", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  const attributes = SvgAttributes.fromMarker({ markup, marker: "work" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    6,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = _render({ frame: 24 }).match(
    /<rect[^>]*data-job="2"[^>]*>/,
  )![0];
  const after = _render({ frame: 150 }).match(
    /<rect[^>]*data-job="2"[^>]*>/,
  )![0];
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "height" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "height" }),
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("every job stays intact with unchanged assignments and fits its final host", () => {
  fixtures.forEach(({ input }) => {
    const initial = _render({ frame: 24, input: input });
    const held = _render({ frame: 150, input: input });
    const initialJobs = [
      ...initial.matchAll(/<rect[^>]*data-job="\d+"[^>]*>/g),
    ].map((match) => match[0]);
    Array.from(
      { length: Math.max(0, Math.floor((120 - 24) / 0.5) + 1) },
      (_, sampleIndex) => 24 + sampleIndex * 0.5,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const jobs = [...markup.matchAll(/<rect[^>]*data-job="\d+"[^>]*>/g)].map(
        (match) => match[0],
      );
      assert.equal(jobs.length, input.jobs.length);
      jobs.forEach((attributes, index) => {
        const job = input.jobs[index];
        const x = SvgAttributes.getNumberFromMarkup({
          attributes: attributes,
          name: "x",
        });
        const y = SvgAttributes.getNumberFromMarkup({ attributes, name: "y" });
        const height = SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "height",
        });
        assert.equal(
          height,
          SvgAttributes.getNumberFromMarkup({
            attributes: initialJobs[index],
            name: "height",
          }),
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "data-quantity",
          }),
          job.cpuHours,
        );
        assert.ok(
          x >= 55 && x + 80 <= 905 && y >= 99.999 && y + height <= 370.001,
        );
        if (job.initialHostId === job.finalHostId) {
          assert.equal(attributes, initialJobs[index]);
        }
      });
    });
    input.hosts.forEach((host, index) => {
      const jobs = [...held.matchAll(/<rect[^>]*data-job="\d+"[^>]*>/g)].map(
        (match) => match[0],
      );
      const assigned = jobs.filter(
        (_, jobIndex) => input.jobs[jobIndex].finalHostId === host.id,
      );
      const occupied = assigned.reduce(
        (sum, attributes) =>
          sum +
          SvgAttributes.getNumberFromMarkup({ attributes, name: "height" }),
        0,
      );
      const capacity =
        (host.capacityCpuHours /
          Math.max(...input.hosts.map(prop("capacityCpuHours")))) *
        110;
      assert.ok(occupied <= capacity + 1e-9);
      assigned.forEach((attributes) =>
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
          75 + index * 215,
        ),
      );
      const bay = held.match(
        new RegExp(`<rect[^>]*data-bay="${index}"[^>]*>`),
      )![0];
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "height" }),
        assigned.length ? capacity : 8,
      );
    });
  });
});

test("the resolved labels state both occupied and empty host counts", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /aria-label="Occupied hosts: 2 · Sleep: 1"/);
});

test("all opaque work rectangles remain pairwise disjoint through fractional transfers", () => {
  [...REVIEW_FIXTURES, ...fixtures, ...transferStressFixtures].forEach(
    ({ id, input }) => {
      inputSchema.parse(input);
      Array.from(
        { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
        (_, sampleIndex) => 36 + sampleIndex * 0.25,
      ).forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const jobs = [
          ...markup.matchAll(/<rect[^>]*data-job="\d+"[^>]*>/g),
        ].map(([attributes]) => ({
          x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
          y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
          width: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "width",
          }),
          height: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "height",
          }),
          attributes,
        }));
        assert.equal(jobs.length, input.jobs.length);
        jobs.forEach((job, index) => {
          assert.equal(job.width, 80);
          assert.ok(!/opacity=|visibility=|display=/.test(job.attributes));
          jobs.slice(index + 1).forEach((other, offset) => {
            const overlapX =
              Math.min(job.x + job.width, other.x + other.width) -
              Math.max(job.x, other.x);
            const overlapY =
              Math.min(job.y + job.height, other.y + other.height) -
              Math.max(job.y, other.y);
            assert.ok(
              overlapX <= 1e-8 || overlapY <= 1e-8,
              `${id}: jobs ${index}/${index + offset + 1} overlap ${overlapX} x ${overlapY} at ${frame}`,
            );
          });
        });
      });
    },
  );
});

test("staggered transfers clear the complete visible capacity caption rails", () => {
  Array.from(REVIEW_FIXTURES).forEach(({ id, input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
      (_, sampleIndex) => 36 + sampleIndex * 0.25,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const jobs = [...markup.matchAll(/<rect[^>]*data-job="\d+"[^>]*>/g)].map(
        ([attributes]) => attributes,
      );
      const captions = [
        ...markup.matchAll(/<text[^>]* y="366"[^>]*>(.*?)<\/text>/g),
      ];
      captions.forEach(([attributes, text]) => {
        const x = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
        const bottom =
          366 +
          [...text.matchAll(/dy="([^"]+)"/g)].reduce(
            (sum, match) => sum + Number(match[1]),
            0,
          ) +
          3.6;
        jobs.forEach((job) =>
          assert.ok(
            SvgAttributes.getNumberFromMarkup({ attributes: job, name: "x" }) +
              80 <=
              x ||
              SvgAttributes.getNumberFromMarkup({
                attributes: job,
                name: "x",
              }) >=
                x + 65 ||
              SvgAttributes.getNumberFromMarkup({
                attributes: job,
                name: "y",
              }) +
                SvgAttributes.getNumberFromMarkup({
                  attributes: job,
                  name: "height",
                }) <=
                354 ||
              SvgAttributes.getNumberFromMarkup({
                attributes: job,
                name: "y",
              }) >= bottom,
            `${id}: job covers caption rail at ${frame}`,
          ),
        );
      });
    });
  });
});

test("accepted fractional full stacks render all work during backward seeks", () => {
  const input = REVIEW_FIXTURES.find(
    ({ id }) => id === "fractional-full-stack",
  )!.input;
  inputSchema.parse(input);
  const frames = [
    0, 24, 36, 47.999999, 48, 48.000001, 72, 107.999999, 108, 108.000001, 150,
    179,
  ];
  const snapshots = frames.map((frame) =>
    _render({ frame: frame, input: input }),
  );
  [...frames].reverse().forEach((frame) => {
    assert.equal(
      _render({ frame: frame, input: input }),
      snapshots[frames.indexOf(frame)],
    );
    const jobs = _getJobs({ frame, input });
    assert.equal(jobs.length, 8);
    jobs.forEach((job, index) => {
      assert.equal(job.width, 80);
      assert.equal(job.height, (input.jobs[index].cpuHours / 36.3) * 110);
      assert.ok(Number.isFinite(job.x) && Number.isFinite(job.y));
      if ([3, 4, 6].includes(index)) {
        assert.deepEqual(job, _getJobs({ frame: 24, input })[index]);
      }
    });
    assert.match(
      _render({ frame: frame, input: input }),
      /aria-label="Work conserved: 36.3 CPU-hours"/,
    );
  });
  const finalTops = [16, 16.7, 17.4, 2, 10, 17.6, 18, 18.3];
  _getJobs({ frame: 150, input }).forEach((job, index) => {
    assert.ok(Math.abs(job.x - ([3, 4, 6].includes(index) ? 75 : 290)) < 1e-10);
    assert.ok(
      Math.abs(job.y - (370 - (finalTops[index] / 36.3) * 110)) < 1e-10,
    );
  });
});

test("route endpoints outside the grid never alias another valid cell", () => {
  [
    { from: { x: 75, y: 99 }, to: { x: 290, y: 260 } },
    { from: { x: 75, y: 100 }, to: { x: 290, y: 99 } },
    { from: { x: 54, y: 100 }, to: { x: 290, y: 260 } },
    { from: { x: 75, y: 100 }, to: { x: 826, y: 260 } },
  ].forEach((endpoints) =>
    assert.equal(
      findJobRoute({ ...endpoints, height: 110, obstacles: [] }),
      undefined,
    ),
  );
});
