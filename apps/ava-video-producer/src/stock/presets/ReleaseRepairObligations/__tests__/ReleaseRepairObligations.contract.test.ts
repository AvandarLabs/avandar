/** Semantic geometry assertions for the authored study. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { setupI18n } from "@lingui/core";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { makeLocalizedStockDataFromContract } from "../../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../../i18n/StockCopyMessages";
import { releaseRepairObligationsContract } from "../ReleaseRepairObligations.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../ReleaseRepairObligations.fixtures";
import { inputSchema, type Input } from "../ReleaseRepairObligations.schema";
import { render, options } from "./ReleaseRepairObligationsTestHelpers";

test("complete rejection fixtures reject structural and reference violations", () =>
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  ));

test("one open blocker holds the whole artifact while follow-ups stay attached after delivery", () => {
  const heldInput = fixtures[3].input;
  const deliveredInput = {
    ...heldInput,
    issues: heldInput.issues.map((issue) =>
      issue.releaseRole === "blocking"
        ? { ...issue, state: "resolved" as const }
        : issue,
    ),
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
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: held, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "x" }),
  );
  const recipient = SvgAttributes.fromMarker({
    markup: deliveredMarkup,
    marker: "recipient-bay",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: delivered, name: "x" }) >=
      SvgAttributes.getNumberFromMarkup({ attributes: recipient, name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: delivered, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: delivered,
        name: "width",
      }) <=
      SvgAttributes.getNumberFromMarkup({ attributes: recipient, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: recipient,
          name: "width",
        }),
  );
  assert.match(render({ frame: 150, input: heldInput }), /data-held-bracket=/);
  assert.doesNotMatch(deliveredMarkup, /data-held-bracket=/);
  deliveredInput.issues.filter(propEq("state", "open")).forEach((issue) => {
    assert.ok(deliveredMarkup.includes(`data-attached-issue="${issue.id}"`));
    assert.ok(deliveredMarkup.includes(`data-register-issue="${issue.id}"`));
    [issue.label, issue.owner, issue.dueLabel].forEach((text) =>
      assert.ok(deliveredMarkup.includes(`aria-label="${text}"`)),
    );
  });
  assert.doesNotMatch(
    render({ frame: 30, input: deliveredInput }),
    /data-register-issue=/,
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("every indexed default-copy path resolves while authored input remains exact", () => {
  const contract = releaseRepairObligationsContract;
  const supplied = structuredClone(DEFAULT_INPUT);
  const messages = Object.fromEntries(
    contract.defaultTextPaths.map((path, index) => [
      StockCopyMessages.getDefaultMessageIdFromPath({ id: contract.id, path }),
      `Traduit ${index}`,
    ]),
  );
  const i18n = setupI18n({ locale: "fr", messages: { fr: messages } });
  const resolved = makeLocalizedStockDataFromContract({ contract, i18n });
  contract.defaultTextPaths.forEach((path, index) => {
    const value = path.reduce<unknown>(
      (parent, key) => Reflect.get(parent as object, key),
      resolved.defaultInput,
    );
    assert.equal(value, `Traduit ${index}`);
  });
  assert.deepEqual(DEFAULT_INPUT, supplied);
  assert.notEqual(resolved.defaultInput, DEFAULT_INPUT);
});

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
    issues: fixtures[2].input.issues.map((issue) => ({
      ...issue,
      label: `界 ${"界".repeat(17)} ${"界".repeat(28)}`.slice(0, 28),
    })),
  });
  const markup = render({ frame: 150, input: input });
  const artifact = SvgAttributes.fromMarker({
    markup,
    marker: "release-artifact",
  });
  const rows = [
    ...markup.matchAll(/<g data-attached-issue="[^"]*">([\s\S]*?)<\/g>/g),
  ].map(([, group]) => {
    const text = group.match(
      /<text aria-label="[^"]*"([^>]*)>([\s\S]*?)<\/text>/,
    );
    assert.ok(text);
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: text[1],
      name: "y",
    });
    const fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: text[1],
      name: "font-size",
    });
    const numLines = [...text[2].matchAll(/<tspan /g)].length;
    return {
      top: y - fontSize,
      bottom: y + (numLines - 1) * fontSize * 1.3 + fontSize * 0.3,
    };
  });
  assert.equal(rows.length, 4);
  rows
    .slice(1)
    .forEach((row, index) =>
      assert.ok(
        row.top > rows[index].bottom,
        `${row.top} <= ${rows[index].bottom}`,
      ),
    );
  assert.ok(
    rows.at(-1)!.bottom <
      SvgAttributes.getNumberFromMarkup({ attributes: artifact, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: artifact,
          name: "height",
        }),
  );
});

test("copy extraction includes every explicit indexed default without changing author input", () => {
  const contract = releaseRepairObligationsContract;
  const messages = StockCopyMessages.getMessagesFromContract({
    [contract.id]: contract,
  });
  contract.defaultTextPaths.forEach((path) => {
    const original = path.reduce<unknown>(
      (parent, key) => Reflect.get(parent as object, key),
      DEFAULT_INPUT,
    );
    assert.equal(
      messages[
        StockCopyMessages.getDefaultMessageIdFromPath({ id: contract.id, path })
      ],
      original,
    );
  });
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
      issues: fixtures[2].input.issues.map((issue, index) => ({
        ...issue,
        state: index === 0 ? ("resolved" as const) : issue.state,
      })),
    },
  ].forEach((input) => {
    ["tabs", "margin-notches"].forEach((issueMarks) =>
      [true, false].forEach((showResolvedIssues) =>
        [50, 65, 80, 89].forEach((frame) => {
          const configured: Input = {
            ...input,
            issueMarks: issueMarks as Input["issueMarks"],
            showResolvedIssues,
          };
          const markup = render({ frame: frame, input: configured });
          const connectors = [
            ...markup.matchAll(/<path data-obligation-unfold="([^"]*)"[^>]*>/g),
          ];
          connectors.forEach(([path, id]) => {
            const mark = [
              ...markup.matchAll(
                new RegExp(
                  `<[^>]*data-${issueMarks === "tabs" ? "issue-tab" : "issue-notch"}="([^"]*)"[^>]*>`,
                  "g",
                ),
              ),
            ].find((match) => match[1] === id)?.[0];
            assert.ok(mark);
            const start = path.match(/ d="M([^ ]+) ([^ ]+)/);
            assert.ok(start);
            if (issueMarks === "tabs") {
              assert.equal(
                Number(start[1]),
                SvgAttributes.getNumberFromMarkup({
                  attributes: mark,
                  name: "x",
                }),
              );
              assert.equal(
                Number(start[2]),
                SvgAttributes.getNumberFromMarkup({
                  attributes: mark,
                  name: "y",
                }) +
                  SvgAttributes.getNumberFromMarkup({
                    attributes: mark,
                    name: "height",
                  }) /
                    2,
              );
            } else {
              const notch = mark.match(/ d="M([^ ]+) ([^ ]+)/);
              assert.ok(notch);
              assert.equal(Number(start[1]), Number(notch[1]));
              assert.equal(Number(start[2]), Number(notch[2]));
            }
          });
        }),
      ),
    );
  });
});

test("visible connector origins paint above the opaque artifact", () => {
  const markup = render({ frame: 65, input: fixtures[2].input });
  const artifact = markup.indexOf("data-release-artifact=");
  [...markup.matchAll(/<path data-obligation-unfold="[^"]*"[^>]*>/g)].forEach(
    (match) => assert.ok(match.index > artifact),
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
