import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArgumentBridge } from "./ArgumentBridge/ArgumentBridge";
import { argumentBridgeContract } from "./ArgumentBridge/ArgumentBridge.contract";
import { CapabilityMatrix } from "./CapabilityMatrix/CapabilityMatrix";
import { capabilityMatrixContract } from "./CapabilityMatrix/CapabilityMatrix.contract";
import { DecisionFork } from "./DecisionFork/DecisionFork";
import { decisionForkContract } from "./DecisionFork/DecisionFork.contract";
import { PairedContrast } from "./PairedContrast/PairedContrast";
import { pairedContrastContract } from "./PairedContrast/PairedContrast.contract";
import { QualifyApparentConflict } from "./QualifyApparentConflict/QualifyApparentConflict";
import { qualifyApparentConflictContract } from "./QualifyApparentConflict/QualifyApparentConflict.contract";
import { ScopeAperture } from "./ScopeAperture/ScopeAperture";
import { scopeApertureContract } from "./ScopeAperture/ScopeAperture.contract";
import { SharedFoundation } from "./SharedFoundation/SharedFoundation";
import { sharedFoundationContract } from "./SharedFoundation/SharedFoundation.contract";
import { TradeoffPivot } from "./TradeoffPivot/TradeoffPivot";
import { tradeoffPivotContract } from "./TradeoffPivot/TradeoffPivot.contract";
import type { StockContract } from "../contracts/StockContract.types";
import type { GraphicProps } from "../graphics-common";
import type { ComponentType } from "react";
/** Generic renderer inputs and schema-bound fixture transformations. */
type UpperBoundsOptions<Input extends object> = {
  contract: StockContract<Input>;
  Renderer: ComponentType<GraphicProps & { input: Input }>;
  createEmpty: (input: Input) => Input;
  createDuplicate: (input: Input) => Input;
};

function _register<Input extends object>(
  options: Readonly<UpperBoundsOptions<Input>>,
): void {
  const { contract, Renderer, createEmpty, createDuplicate } = options;
  test(`${contract.id} accepts upper-only empty fields through schema and rendering`, () => {
    const input = createEmpty(structuredClone(contract.defaultInput));
    assert.equal(contract.inputSchema.safeParse(input).success, true);
    [0, 45, 90, 150, 179].forEach((frame) => {
      const markup = renderToStaticMarkup(
        createElement(
          "svg",
          {},
          createElement(Renderer, {
            input,
            frame,
            id: "bounds",
            accent: "#9fefca",
            background: "#0b1219",
          }),
        ),
      );
      assert.doesNotMatch(markup, /NaN|Infinity|undefined/);
    });
    assert.equal(
      contract.inputSchema.safeParse(createDuplicate(input)).success,
      false,
    );
  });
}

_register({
  contract: pairedContrastContract,
  Renderer: PairedContrast,
  createEmpty: (input) => {
    input.alternatives[0].id = "";
    input.criteria[0].id = "";
    input.focusCriterionId = "";
    return input;
  },
  createDuplicate: (input) => {
    input.alternatives[1].id = "";
    return input;
  },
});
_register({
  contract: capabilityMatrixContract,
  Renderer: CapabilityMatrix,
  createEmpty: (input) => {
    const oldId = input.options[0].id;
    input.options[0].id = "";
    input.capabilities[0].id = "";
    input.capabilities.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.optionId === oldId) {
          cell.optionId = "";
        }
      });
    });
    input.focus = { kind: "column", id: "" };
    return input;
  },
  createDuplicate: (input) => {
    input.options[1].id = "";
    return input;
  },
});
_register({
  contract: decisionForkContract,
  Renderer: DecisionFork,
  createEmpty: (input) => {
    input.branches[0] = { id: "", condition: "", outcome: "" };
    input.selectedBranchId = "";
    return input;
  },
  createDuplicate: (input) => {
    input.branches[1].id = "";
    return input;
  },
});
_register({
  contract: tradeoffPivotContract,
  Renderer: TradeoffPivot,
  createEmpty: (input) => {
    input.gains[0].id = "";
    input.concessions[0].id = "";
    return input;
  },
  createDuplicate: (input) => {
    input.gains.push({ ...input.gains[0] });
    return input;
  },
});
_register({
  contract: argumentBridgeContract,
  Renderer: ArgumentBridge,
  createEmpty: (input) => {
    input.premises[0].id = "";
    return input;
  },
  createDuplicate: (input) => {
    input.premises.push({ ...input.premises[0] });
    return input;
  },
});
_register({
  contract: scopeApertureContract,
  Renderer: ScopeAperture,
  createEmpty: (input) => {
    input.topics[0].id = "";
    return input;
  },
  createDuplicate: (input) => {
    input.topics[1].id = "";
    return input;
  },
});
_register({
  contract: qualifyApparentConflictContract,
  Renderer: QualifyApparentConflict,
  createEmpty: (input) => {
    input.statements[0].id = "";
    return input;
  },
  createDuplicate: (input) => {
    input.statements[1].id = "";
    return input;
  },
});
_register({
  contract: sharedFoundationContract,
  Renderer: SharedFoundation,
  createEmpty: (input) => {
    input.approaches[0].id = "";
    return input;
  },
  createDuplicate: (input) => {
    input.approaches[1].id = "";
    return input;
  },
});

test("ScopeAperture keeps arbitrary accepted IDs in fixed SVG attribute values", () => {
  const input = structuredClone(scopeApertureContract.defaultInput);
  input.topics[0].id = "space 界";
  const markup = renderToStaticMarkup(
    createElement(ScopeAperture, {
      input,
      frame: 90,
      id: "bounds",
      accent: "#9fefca",
      background: "#0b1219",
    }),
  );
  assert.match(markup, /data-topic-position="space 界"/);
});
