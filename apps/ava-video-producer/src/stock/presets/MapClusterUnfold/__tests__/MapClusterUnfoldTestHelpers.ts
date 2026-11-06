/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapClusterUnfold } from "../MapClusterUnfold";
import { DEFAULT_INPUT } from "../MapClusterUnfold.fixtures";
import { type Input } from "../MapClusterUnfold.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(MapClusterUnfold, {
        frame,
        input,
        accent: "#72d5bd",
        id: "packet28",
      }),
    ),
  );

function _marks({ markup, name }: { markup: string; name: string }): string[] {
  return [
    ...markup.matchAll(new RegExp(`<[^>]*data-${name}="[^"]*"[^>]*>`, "g")),
  ].map((match) => match[0]);
}

function _attribute({
  markup,
  name,
}: {
  markup: string;
  name: string;
}): string {
  const result = markup.match(new RegExp(` ${name}="([^"]*)"`));
  assert.ok(result, `Missing ${name} in ${markup}`);
  return result[1];
}

function _number({ markup, name }: { markup: string; name: string }): number {
  return Number(_attribute({ markup, name }));
}

const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  ...Object.values(input.copy),
  frame > 53 && frame < 139 ? input.labels.clusters : input.labels.points,
  ...input.points.map(
    (point, index) =>
      `${index + 1} · ${point.label} → ${input.clusters.findIndex(propEq("id", point.clusterId)) + 1}`,
  ),
  ...input.clusters.map((cluster, index) => `${index + 1} · ${cluster.label}`),
  `${input.labels.total}: ${input.points.length}`,
];
export { render, _marks, _attribute, _number, getVisibleTexts };
