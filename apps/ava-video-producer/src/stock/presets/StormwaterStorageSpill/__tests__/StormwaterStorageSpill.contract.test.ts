import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { CHANGED_INPUT, fixtures } from "../StormwaterStorageSpill.fixtures";
import { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { inputSchema } from "../StormwaterStorageSpill.schema";
import { _render, options } from "./StormwaterStorageSpillTestHelpers";

test("changed authored quantities reach their visible conserved destination", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  const attributes = SvgAttributes.fromMarker({ markup, marker: "overflow" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    50,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "water",
  });
  const after = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "water",
  });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "height" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "height" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "width" }),
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("water fractions conserve inflow without positive minima and spill after filling", () => {
  fixtures.forEach(({ input }) => {
    const incoming = input.event.incomingM3;
    const remaining =
      incoming - (input.event.infiltratedM3 + input.event.dischargedM3);
    const detained = Math.min(remaining, input.detentionCapacityM3);
    const overflow = remaining - detained;
    const markup = _render({ frame: 150, input: input });
    const pool = SvgAttributes.fromMarker({ markup, marker: "water" });
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: pool,
          name: "height",
        }) -
          (detained / incoming) * 140,
      ) < 1e-9,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "height" }),
      380,
    );
    const spill = SvgAttributes.fromMarker({ markup, marker: "overflow-pool" });
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: spill,
          name: "width",
        }) -
          (50 * overflow) / incoming,
      ) < 1e-9,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({ markup, marker: "overflow" }),
        name: "data-quantity",
      }),
      overflow,
    );
    assert.ok(
      Math.abs(
        input.event.infiltratedM3 +
          input.event.dischargedM3 +
          detained +
          overflow -
          incoming,
      ) <=
        incoming * 1e-12,
    );
    const crest = SvgAttributes.fromMarker({
      markup: _render({ frame: 83, input: input }),
      marker: "crest",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: crest,
        name: "stroke-dashoffset",
      }),
      1,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({ markup, marker: "crest" }),
        name: "opacity",
      }),
      overflow > 0 ? 1 : 0,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: spill, name: "x" }),
      input.overflowSide === "left" ? 55 : 855,
    );
  });
});

test("the operator physically holds the moving outlet handle", () => {
  const positions: number[] = [];
  Array.from(
    { length: Math.max(0, Math.floor((48 - 36) / 0.25) + 1) },
    (_, sampleIndex) => 36 + sampleIndex * 0.25,
  ).forEach((frame) => {
    const markup = _render({ frame: frame });
    const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
    const handle = SvgAttributes.fromMarker({ markup, marker: "handle" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cx" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cy" }),
    );
    positions.push(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    );
  });
  assert.notEqual(positions[0], positions.at(-1));
});

test("the left spill path clears the full storage caption rail", () => {
  const input = { ...fixtures[2].input, overflowSide: "left" as const };
  const markup = _render({ frame: 150, input: input });
  const crest = SvgAttributes.fromMarker({ markup: markup, marker: "crest" });
  const crestY = Number(crest.match(/V([\d.]+)H/)![1]);
  const caption = markup.match(
    new RegExp(
      `<text aria-label="${input.detentionCapacityM3} ${input.copy.unit}"[^>]*>(.*?)</text>`,
    ),
  )!;
  const baseline = SvgAttributes.getNumberFromMarkup({
    attributes: caption[0],
    name: "y",
  });
  const bottom =
    baseline +
    [...caption[1].matchAll(/dy="([^"]+)"/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    ) +
    3.6;
  assert.ok(bottom < crestY - 1.5);
});

test("each physical water destination and its caption share a visible unique key", () => {
  [...REVIEW_FIXTURES, ...fixtures].forEach(({ id, input }) => {
    Array.from(["left", "right"] as const).forEach((overflowSide) => {
      Array.from([false, true]).forEach((showBalance) => {
        const supplied = { ...input, overflowSide, showBalance };
        inputSchema.parse(supplied);
        Array.from([24, 60, 90, 108, 150]).forEach((frame) => {
          const markup = _render({ frame: frame, input: supplied });
          const colors = new Set<string>();
          ["infiltration", "discharge", "detained", "overflow"].forEach(
            (destination, index) => {
              const physical = markup.match(
                new RegExp(
                  `<g data-water-key="physical-${destination}"[^>]*>(.*?)</g>`,
                ),
              )?.[1];
              const caption = markup.match(
                new RegExp(
                  `<g data-water-key="caption-${destination}"[^>]*>(.*?)</g>`,
                ),
              )?.[1];
              assert.ok(physical, `${id}: missing physical ${destination} key`);
              assert.ok(caption, `${id}: missing caption ${destination} key`);
              const color = physical.match(/<circle[^>]*fill="([^"]+)"/)![1];
              assert.equal(
                caption.match(/<circle[^>]*fill="([^"]+)"/)![1],
                color,
              );
              assert.match(
                physical,
                new RegExp(`<tspan[^>]*>${index + 1}</tspan>`),
              );
              assert.match(
                caption,
                new RegExp(`<tspan[^>]*>${index + 1}</tspan>`),
              );
              const pool =
                destination === "detained"
                  ? SvgAttributes.fromMarker({ markup, marker: "water" })
                  : destination === "overflow"
                    ? SvgAttributes.fromMarker({
                        markup,
                        marker: "overflow-pool",
                      })
                    : markup.match(
                        new RegExp(
                          `<rect[^>]*data-water-pool="${destination}"[^>]*>`,
                        ),
                      )![0];
              assert.equal(pool.match(/fill="([^"]+)"/)![1], color);
              const expectedKeyX =
                destination === "detained"
                  ? SvgAttributes.getNumberFromMarkup({
                      attributes: pool,
                      name: "x",
                    }) +
                    SvgAttributes.getNumberFromMarkup({
                      attributes: pool,
                      name: "width",
                    }) -
                    20
                  : SvgAttributes.getNumberFromMarkup({
                      attributes: pool,
                      name: "x",
                    }) - 18;
              assert.equal(
                SvgAttributes.getNumberFromMarkup({
                  attributes: physical,
                  name: "cx",
                }),
                expectedKeyX,
              );
              assert.equal(
                SvgAttributes.getNumberFromMarkup({
                  attributes: physical,
                  name: "cy",
                }),
                destination === "detained"
                  ? SvgAttributes.getNumberFromMarkup({
                      attributes: pool,
                      name: "y",
                    }) +
                      SvgAttributes.getNumberFromMarkup({
                        attributes: pool,
                        name: "height",
                      }) +
                      12
                  : SvgAttributes.getNumberFromMarkup({
                      attributes: pool,
                      name: "y",
                    }) - 10,
              );
              const owned = markup.match(
                new RegExp(
                  `<g data-destination="${destination}">(.*?)</g>(.*?)</g>`,
                ),
              )![2];
              const remaining =
                supplied.event.incomingM3 -
                supplied.event.infiltratedM3 -
                supplied.event.dischargedM3;
              const stored = Math.min(remaining, supplied.detentionCapacityM3);
              const amounts = {
                infiltration: supplied.event.infiltratedM3,
                discharge: supplied.event.dischargedM3,
                detained: stored,
                overflow: remaining - stored,
              };
              const name = destination as keyof typeof amounts;
              assert.ok(owned.includes(`aria-label="${supplied.copy[name]}"`));
              assert.ok(
                owned.includes(
                  `aria-label="${amounts[name]} ${supplied.copy.unit}"`,
                ),
              );
              colors.add(color);
            },
          );
          assert.equal(colors.size, 4);
        });
      });
    });
  });
});
