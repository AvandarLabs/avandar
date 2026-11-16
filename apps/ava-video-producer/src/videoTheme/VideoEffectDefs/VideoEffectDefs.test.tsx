import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoEffectDefs } from "./VideoEffectDefs";

test("no filters render nothing", () => {
  assert.equal(
    renderToStaticMarkup(
      <svg>
        <VideoEffectDefs graphicId="g" filters={[]} />
      </svg>,
    ),
    "<svg></svg>",
  );
});

test("a drop shadow becomes an feDropShadow under the token's id", () => {
  const markup = renderToStaticMarkup(
    <svg>
      <VideoEffectDefs
        graphicId="g"
        filters={[
          {
            path: "text.graphic.label",
            primitives: [
              {
                kind: "dropShadow",
                dx: 0,
                dy: 2,
                stdDeviation: 2,
                color: "#000000",
                opacity: 0.5,
              },
            ],
          },
        ]}
      />
    </svg>,
  );
  assert.match(markup, /<filter id="g-fx-text-graphic-label"/);
  assert.match(
    markup,
    /<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/,
  );
});
