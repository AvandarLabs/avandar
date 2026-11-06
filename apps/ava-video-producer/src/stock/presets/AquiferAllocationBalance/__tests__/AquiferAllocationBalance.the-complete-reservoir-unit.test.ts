/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("the complete reservoir unit clears tank paint", async () => {
  const { aquiferAllocationBalanceContract: correctionContract } =
    await import("../AquiferAllocationBalance.contract");
  const { AquiferAllocationBalance: Component } =
    await import("../AquiferAllocationBalance");
  const { SvgPaintAssertions } =
    await import("../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    const unit = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      markup,
    ).find(propEq("ariaLabel", input.copy.unit))!;
    assert.ok(
      unit.left > 722 || unit.top > 398,
      "The complete unit clears the tank border and fill",
    );
  });
});
