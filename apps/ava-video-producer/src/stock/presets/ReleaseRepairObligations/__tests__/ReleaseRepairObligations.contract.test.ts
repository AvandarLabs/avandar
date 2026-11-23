import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { releaseRepairObligationsContract } from "../ReleaseRepairObligations.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../ReleaseRepairObligations.fixtures";
import { inputSchema } from "../ReleaseRepairObligations.schema";
import { assertOneOpenBlockerHoldsHeld as _assertOneOpenBlockerHoldsHeld } from "./assertOneOpenBlockerHoldsHeld";
import { assertUnfoldingConnectorsContactVisibleInput as _assertUnfoldingConnectorsContactVisibleInput } from "./assertUnfoldingConnectorsContactVisibleInput";
import { makeFullWrappedLimitationRowsMarkupFromMarkup as _makeFullWrappedLimitationRowsMarkupFromMarkup } from "./makeFullWrappedLimitationRowsMarkupFromMarkup";
import { render, options } from "./ReleaseRepairObligationsTestHelpers";

test("complete rejection fixtures reject structural and reference violations", () => {
  return invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("one open blocker holds the whole artifact while follow-ups stay attached after delivery", () => {
  const heldInput = fixtures[3].input;
  const deliveredInput = {
    ...heldInput,
    issues: heldInput.issues.map((issue) => {
      return issue.releaseRole === "blocking"
        ? { ...issue, state: "resolved" as const }
        : issue;
    }),
  };
  const setup = SvgAttributes.fromMarker({
    markup: render({ frame: 30, input: deliveredInput }),
    marker: "release-artifact",
  });
  const held = SvgAttributes.fromMarker({
    markup: render({ frame: 150, input: heldInput }),
    marker: "release-artifact",
  });
  const deliveredMarkup = render({ frame: 150, input: deliveredInput });
  const delivered = SvgAttributes.fromMarker({
    markup: deliveredMarkup,
    marker: "release-artifact",
  });
  _assertOneOpenBlockerHoldsHeld({
    held,
    setup,
    deliveredMarkup,
    delivered,
    heldInput,
  });
  deliveredInput.issues.filter(propEq("state", "open")).forEach((issue) => {
    assert.ok(deliveredMarkup.includes(`data-attached-issue="${issue.id}"`));
    assert.ok(deliveredMarkup.includes(`data-register-issue="${issue.id}"`));
    [issue.label, issue.owner, issue.dueLabel].forEach((text) => {
      return assert.ok(deliveredMarkup.includes(`aria-label="${text}"`));
    });
  });
  assert.doesNotMatch(
    render({ frame: 30, input: deliveredInput }),
    /data-register-issue=/,
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("unfolding register connectors start at the actual visible follow-up tab", () => {
  [true, false].forEach((showResolvedIssues) => {
    const input = { ...DEFAULT_INPUT, showResolvedIssues };
    const markup = render({ frame: 72, input: input });
    const tab = markup.match(/<rect data-issue-tab="index"[^>]*>/)?.[0];
    assert.ok(tab);
    const connector = SvgAttributes.fromMarker({
      markup,
      marker: "obligation-unfold",
    });
    const start = connector.match(/ d="M[^ ]+ ([^ ]+)/);
    assert.ok(start);
    assert.equal(
      Number(start[1]),
      SvgAttributes.getNumberFromMarkup({ attributes: tab, name: "y" }) + 12,
    );
  });
});

test("full wrapped limitation rows remain separate inside the dense delivered artifact", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    issues: fixtures[2].input.issues.map((issue) => {
      return {
        ...issue,
        label: `界 ${"界".repeat(17)} ${"界".repeat(28)}`.slice(0, 28),
      };
    }),
  });
  const markup = render({ frame: 150, input: input });
  const artifact = SvgAttributes.fromMarker({
    markup,
    marker: "release-artifact",
  });
  const { rows } = _makeFullWrappedLimitationRowsMarkupFromMarkup(markup);
  assert.equal(rows.length, 4);
  rows.slice(1).forEach((row, index) => {
    return assert.ok(
      row.top > rows[index].bottom,
      `${row.top} <= ${rows[index].bottom}`,
    );
  });
  assert.ok(
    rows.at(-1)!.bottom <
      SvgAttributes.getNumberFromMarkup({ attributes: artifact, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: artifact,
          name: "height",
        }),
  );
});

test("empty owner and due remain valid on resolved and open blocking issues", () => {
  ["resolved", "open"].forEach((state) => {
    const input = {
      ...DEFAULT_INPUT,
      issues: [{ ...DEFAULT_INPUT.issues[0], state, owner: "", dueLabel: "" }],
    };
    assert.equal(inputSchema.safeParse(input).success, true);
  });
});

test("supplied multilingual prose and literal punctuation remain unchanged", () => {
  const supplied = { ...DEFAULT_INPUT, recipientLabel: "R&D <x>\t界\n👩‍🔬" };
  assert.deepEqual(inputSchema.parse(supplied), supplied);
  assert.ok(
    render({ frame: 90, input: supplied }).includes(
      'aria-label="R&amp;D &lt;x&gt;\t界\n👩‍🔬"',
    ),
  );
});

test("unfolding connectors contact the visible mark boundary before routing outside the artifact", () => {
  [
    fixtures[2].input,
    {
      ...fixtures[2].input,
      issues: fixtures[2].input.issues.map((issue, index) => {
        return {
          ...issue,
          state: index === 0 ? ("resolved" as const) : issue.state,
        };
      }),
    },
  ].forEach((input) => {
    return _assertUnfoldingConnectorsContactVisibleInput(input);
  });
});

test("visible connector origins paint above the opaque artifact", () => {
  const markup = render({ frame: 65, input: fixtures[2].input });
  const artifact = markup.indexOf("data-release-artifact=");
  [...markup.matchAll(/<path data-obligation-unfold="[^"]*"[^>]*>/g)].forEach(
    (match) => {
      return assert.ok(match.index > artifact);
    },
  );
});

test("serialized controls preserve the reviewed pre-extraction bounds and message identities", () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(releaseRepairObligationsContract.controls))
      .digest("hex"),
    "de95f223dcb8e17779340db8c41c3983017bb584863297d5786c63afe8066a65",
  );
});
