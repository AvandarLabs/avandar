/**
 * Behavioral, contract, and text-layout coverage for utterance-to-model-draft.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { UtteranceToModelDraft } from ".././UtteranceToModelDraft";
import { fixtures } from ".././UtteranceToModelDraft.fixtures";
import { _render, _attributes } from "./UtteranceToModelDraftTestHelpers";

test("original source and caption paint over copies with full opaque clearance", () => {
  fixtures.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((105 - 49) / 1) + 1) },
      (_, sampleIndex) => 49 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = renderToStaticMarkup(
        createElement(UtteranceToModelDraft, {
          frame,
          input,
          accent: "#65d6ad",
          background: "#24303a",
          id: "lift",
        }),
      );
      const backing = SvgAttributes.fromMarker({
        markup,
        marker: "source-backing",
      });
      const caption = SvgAttributes.fromMarker({
        markup,
        marker: "draft-caption-backing",
      });
      assert.match(backing, /fill="#24303a"/);
      assert.match(caption, /fill="#24303a"/);
      assert.ok(
        markup.lastIndexOf("data-phrase-copy=") <
          markup.indexOf("data-source-backing="),
      );
      assert.ok(
        markup.lastIndexOf("data-phrase-copy=") <
          markup.indexOf("data-draft-caption-backing="),
      );
      assert.ok(
        markup.indexOf("data-source-backing=") <
          markup.indexOf("data-source-fragment="),
      );
      const bottom =
        SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: backing,
          name: "height",
        });
      const fragments = [
        ...markup.matchAll(/data-source-fragment="[^"]+"><text([^>]+)>/g),
      ];
      assert.equal(fragments.length, input.sentenceParts.length);
      fragments.forEach((fragment) => {
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: fragment[1],
            name: "y",
          }) -
            12 >=
            SvgAttributes.getNumberFromMarkup({
              attributes: backing,
              name: "y",
            }),
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: fragment[1],
            name: "y",
          }) +
            12 <=
            bottom,
        );
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "x" }) <=
          60,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: backing,
            name: "width",
          }) >=
          900,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) <=
          230 - 16,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: caption,
            name: "height",
          }) >=
          230 + 20.8 + 4,
      );
    });
  });
});

test("only one phrase copy travels and role captions wait until all copies finish", () => {
  fixtures.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((105 - 49) / 1) + 1) },
      (_, sampleIndex) => 49 + sampleIndex * 1,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const copies = _attributes({ markup, marker: "phrase-copy" });
      const sockets = _attributes({ markup, marker: "model-item" });
      assert.equal(copies.length, 3 + input.draft.attributes.length);
      assert.equal(sockets.length, copies.length);
      const active = copies.filter(
        (copy) =>
          SvgAttributes.getNumberFromMarkup({
            attributes: copy,
            name: "opacity",
          }) > 0,
      );
      assert.ok(
        active.length <= 1,
        `frame ${frame}: overlapping phrase copies`,
      );
      if (active.length) {
        sockets.forEach((socket) =>
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: socket,
              name: "opacity",
            }),
            0,
          ),
        );
      }
      if (frame === 105) {
        assert.equal(active.length, 0);
        sockets.forEach((socket) =>
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: socket,
              name: "opacity",
            }),
            1,
          ),
        );
      }
    });
    [55, 60].forEach((frame) =>
      assert.ok(
        _attributes({
          markup: _render({ frame: frame, input: input }),
          marker: "phrase-copy",
        }).some(
          (copy) =>
            SvgAttributes.getNumberFromMarkup({
              attributes: copy,
              name: "opacity",
            }) > 0,
        ),
      ),
    );
  });
});
