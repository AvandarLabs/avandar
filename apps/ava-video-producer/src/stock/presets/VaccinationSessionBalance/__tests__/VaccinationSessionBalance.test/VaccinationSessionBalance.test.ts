import { VaccinationSessionBalanceTestState } from "./VaccinationSessionBalanceTestState";

const {
  render: _render,
  textLayoutOptions,
  getRecipientLabelBounds: _getRecipientLabelBounds,
} = VaccinationSessionBalanceTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { vaccinationSessionBalanceContract } from "../../VaccinationSessionBalance.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../VaccinationSessionBalance.fixtures";
import {
  inputSchema,
  type Input,
} from "../../VaccinationSessionBalance.schema";
import { assertTokensLeaveCarrierOnceFrame as _assertTokensLeaveCarrierOnceFrame } from "./assertTokensLeaveCarrierOnceFrame";

test("default vaccination hold frame retains authored dose and recipient counts", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-dose=/g) ?? []).length,
    DEFAULT_INPUT.units.length,
  );
  assert.equal(
    (markup.match(/data-recipient=/g) ?? []).length,
    DEFAULT_INPUT.recipients.length,
  );
});

registerStockPresetAssertions({
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: vaccinationSessionBalanceContract,
});

registerStockTextLayoutAssertions(textLayoutOptions);

test("tokens leave the carrier once, remain conserved and settle beside the exact recipient", () => {
  const input = fixtures[2].input;
  [24, 36, 58, 80, 108, 150].forEach((frame) => {
    return _assertTokensLeaveCarrierOnceFrame({ frame, input });
  });
  const onePerson: Input = {
    ...input,
    recipients: [input.recipients[0]],
    units: input.units.map((unit) => {
      return { ...unit, recipientId: input.recipients[0].id };
    }),
  };
  assert.equal(inputSchema.safeParse(onePerson).success, true);
  const markup = _render({ frame: 150, input: onePerson });
  assert.equal((markup.match(/data-recipient=/g) ?? []).length, 1);
  assert.match(markup, /data-people-total="1"/);
  assert.match(markup, /data-equation="12\+0\+0"/);
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[1].input }),
    /data-recipient=/,
  );
});

test("every final destination owns precisely its authored unit identities", () => {
  const markup = _render({ frame: 150 });
  DEFAULT_INPUT.units.forEach((unit) => {
    const token = Array.from(
      markup.matchAll(/<rect data-dose="([^"]*)"[^>]*>/g),
    ).find((match) => {
      return match[1] === unit.id;
    })?.[0];
    assert.ok(token);
    assert.ok(token.includes(`data-outcome="${unit.outcome}"`));
    if (unit.recipientId !== null) {
      assert.ok(token.includes(`data-recipient-id="${unit.recipientId}"`));
    } else {
      assert.ok(!token.includes("data-recipient-id="));
    }
  });
});

test("concentrated doses stay clear of complete recipient labels and neighboring rows", () => {
  [1, 6].forEach((numRecipients) => {
    const recipients = fixtures[2].input.recipients.slice(0, numRecipients);
    const input = inputSchema.parse({
      ...fixtures[2].input,
      recipients,
      units: Array.from({ length: 12 }, (_, index) => {
        return {
          id: `dose${index}`,
          outcome: "administered",
          recipientId:
            recipients[
              index < 13 - numRecipients ? 0 : index - (12 - numRecipients)
            ].id,
        };
      }),
    });
    [108, 150, 167].forEach((frame) => {
      const markup = _render({ frame, input });
      const labels = _getRecipientLabelBounds(markup);
      assert.equal(labels.length, numRecipients * 2);
      const tokens = Array.from(
        markup.matchAll(
          /<rect data-dose="[^"]*"[^>]* x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g,
        ),
      );
      assert.equal(tokens.length, 12);
      tokens.forEach(([, x, y, width, height]) => {
        return labels.forEach((label) => {
          assert.ok(
            Number(x) + Number(width) <= label.left ||
              Number(x) >= label.right ||
              Number(y) + Number(height) <= label.top ||
              Number(y) >= label.bottom,
            `dose [${x}, ${y}, ${width}, ${height}] intersects label ${JSON.stringify(label)}`,
          );
        });
      });
    });
  });
});
