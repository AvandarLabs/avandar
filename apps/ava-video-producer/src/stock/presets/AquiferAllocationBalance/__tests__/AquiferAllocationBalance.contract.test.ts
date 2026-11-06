/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { aquiferAllocationBalanceContract as contract } from ".././AquiferAllocationBalance.contract";
import {
  DEFAULT_INPUT,
  changedInput,
  fixtures,
} from ".././AquiferAllocationBalance.fixtures";
import {
  inputSchema,
  SEMANTIC_RULES,
} from ".././AquiferAllocationBalance.schema";
import {
  _render,
  assertions,
  _getCircleBounds,
  _getOwnershipGroup,
  _assertOwner,
  _assertRouteOwnership,
  _assertOwnershipClearance,
} from "./AquiferAllocationBalanceTestHelpers";
import type { Input } from ".././AquiferAllocationBalance.schema";

test("only approved withdrawal leaves storage while the unmet request remains hollow", () => {
  const start = SvgAttributes.fromMarker({
    markup: _render({ frame: 24, input: changedInput }),
    marker: "aquifer-fill",
  });
  const hold = SvgAttributes.fromMarker({
    markup: _render({ frame: 150, input: changedInput }),
    marker: "aquifer-fill",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "height" }),
    (150 * 0.5) / 2,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "height" }),
    (150 * 1) / 2,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: changedInput }),
      marker: "unallocated",
    }),
    /fill="none"/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: changedInput }),
    /data-flow="requested"/,
  );
});

registerStockPresetAssertions(assertions);

registerStockTextLayoutAssertions(assertions);

test("serialized semantic rules retain every runtime relation", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(contract.semanticRules)).map(
      ({ id, paths }: { id: string; paths: string[] }) => ({ id, paths }),
    ),
    [
      {
        id: "initial-capacity",
        paths: ["aquifer"],
      },
      {
        id: "approval",
        paths: ["flows.approvedWithdrawalM3", "flows.requestedWithdrawalM3"],
      },
      {
        id: "recharge-capacity",
        paths: ["aquifer", "flows.rechargeM3"],
      },
      {
        id: "nonnegative-final",
        paths: ["aquifer.initialM3", "flows"],
      },
    ],
  );
  assert.ok(
    SEMANTIC_RULES.every(
      (rule) => rule.paths.length && rule.description.length,
    ),
  );
});

test("the planner hand remains in contact while setting every allowed approval share", () => {
  [0, 0.25, 1].forEach((share) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      flows: { ...DEFAULT_INPUT.flows, approvedWithdrawalM3: share * 200 },
    };
    [36, 36.5, 42, 49.5, 50, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input }),
        hand = SvgAttributes.fromMarker({ markup, marker: "planner-hand" }),
        knob = SvgAttributes.fromMarker({
          markup: markup,
          marker: "approval-knob",
        });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: knob, name: "cx" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: knob, name: "cy" }),
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }) +
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "r" }) <
          330,
      );
    });
  });
});

test("bounded fractional storage ends at the authored balance without refilling", () => {
  const fraction: Input = {
    ...DEFAULT_INPUT,
    aquifer: { initialM3: 0.1, diagramCapacityM3: 0.1 + 0.2 },
    flows: {
      rechargeM3: 0.2,
      naturalOutflowM3: 0.2,
      requestedWithdrawalM3: 0.1,
      approvedWithdrawalM3: 0.1,
    },
  };
  [fraction, ...fixtures.map(prop("input"))].forEach((input) => {
    inputSchema.parse(input);
    const final =
      input.aquifer.initialM3 +
      input.flows.rechargeM3 -
      input.flows.naturalOutflowM3 -
      input.flows.approvedWithdrawalM3;
    [0, 36, 48.5, 66, 72, 72.5, 90, 107.5, 108, 150, 179].forEach((frame) => {
      const fill = SvgAttributes.fromMarker({
          markup: _render({ frame: frame, input: input }),
          marker: "aquifer-fill",
        }),
        height = SvgAttributes.getNumberFromMarkup({
          attributes: fill,
          name: "height",
        });
      assert.ok(height >= 0 && height <= 150);
      assert.ok(
        Math.abs(
          SvgAttributes.getNumberFromMarkup({ attributes: fill, name: "y" }) +
            height -
            380,
        ) < 1e-9,
      );
      if (frame >= 108) {
        assert.equal(height, 150 * (final / input.aquifer.diagramCapacityM3));
      }
    });
  });
});

test("zero approval never turns requested water into an executed path", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    flows: {
      rechargeM3: 0,
      naturalOutflowM3: 0,
      requestedWithdrawalM3: 1000000,
      approvedWithdrawalM3: 0,
    },
    showUnallocatedRequest: false,
  };
  const markup = _render({ frame: 150, input: input });
  assert.doesNotMatch(markup, /data-unallocated|data-flow="requested"/);
  const pumping = markup.match(/<path[^>]*data-flow="approved"[^>]*>/)![0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: pumping, name: "opacity" }),
    0,
  );
  assert.match(markup, /aria-label="1000000"/);
});

test("visible keys tie every aquifer boundary flow and hollow bracket to its caption and quantity", () => {
  const emptyCaptions: Input = {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      recharge: "",
      approved: "",
      naturalOutflow: "",
      unallocated: "",
    },
  };
  const zero: Input = {
    ...DEFAULT_INPUT,
    flows: {
      rechargeM3: 0,
      naturalOutflowM3: 0,
      requestedWithdrawalM3: 0,
      approvedWithdrawalM3: 0,
    },
  };
  [...fixtures.map(({ input }) => input), emptyCaptions, zero].forEach(
    (input) => {
      inputSchema.parse(input);
      [0, 36, 50, 66, 72, 90, 108, 150, 179].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        _assertOwnershipClearance(markup);
        [
          {
            owner: "recharge",
            number: 1,
            label: input.copy.recharge,
            quantity: input.flows.rechargeM3,
          },
          {
            owner: "approved",
            number: 2,
            label: input.copy.approved,
            quantity: input.flows.approvedWithdrawalM3,
          },
          {
            owner: "natural",
            number: 3,
            label: input.copy.naturalOutflow,
            quantity: input.flows.naturalOutflowM3,
          },
        ].forEach((term) => {
          _assertOwner({ markup, ...term });
          _assertRouteOwnership({ markup, owner: term.owner });
        });
        if (input.showUnallocatedRequest) {
          _assertOwner({
            markup,
            owner: "unallocated",
            number: 4,
            label: input.copy.unallocated,
            quantity:
              input.flows.requestedWithdrawalM3 -
              input.flows.approvedWithdrawalM3,
          });
          const bracket = SvgAttributes.fromMarker({
            markup,
            marker: "unallocated",
          });
          assert.match(bracket, /fill="none"/);
          const key = SvgAttributes.fromMarker({
            markup: _getOwnershipGroup({
              markup,
              marker: "flow-ownership",
              owner: "unallocated",
            }),
            marker: "ownership-key",
          });
          assert.ok(
            Math.abs(
              SvgAttributes.getNumberFromMarkup({
                attributes: key,
                name: "cx",
              }) -
                SvgAttributes.getNumberFromMarkup({
                  attributes: bracket,
                  name: "x",
                }),
            ) <= 20,
          );
          assert.ok(
            _getCircleBounds(key).right <
              SvgAttributes.getNumberFromMarkup({
                attributes: bracket,
                name: "x",
              }) -
                0.5,
          );
        } else {
          assert.doesNotMatch(
            markup,
            /data-(?:flow-ownership|budget-term)="unallocated"/,
          );
        }
        assert.doesNotMatch(markup, /data-flow="requested"/);
      });
    },
  );
});

test("full ownership keys and budget labels clear neighboring rows for every dense prefix", () => {
  Array.from({ length: 28 }, (_, index) => index + 1).forEach((wordLength) => {
    const label = `界 ${"界".repeat(wordLength)} ${"界".repeat(28)}`.slice(
      0,
      28,
    );
    const input: Input = {
      ...fixtures[2].input,
      copy: {
        ...fixtures[2].input.copy,
        initial: label,
        recharge: label,
        naturalOutflow: label,
        approved: label,
        requested: label,
        unallocated: label,
        final: label,
      },
    };
    inputSchema.parse(input);
    _assertOwnershipClearance(_render({ frame: 150, input: input }));
  });
});
