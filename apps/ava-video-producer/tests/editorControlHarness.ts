import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isPlainObject } from "@avandar/utils";
import { build } from "esbuild";
import { yamlPlugin } from "../scripts/yaml/yamlPlugin";
import type {
  StockMessageDescriptor,
  StockControl,
} from "../src/stock/contracts/StockContract.types";

const require: NodeJS.Require = createRequire(import.meta.url);

const {
  JSDOM,
}: {
  JSDOM: new (
    html: string,
    settings: object,
  ) => {
    window: Window;
    close?: () => void;
  };
} = require("jsdom");

const dom: { window: Window; close?: () => void } = new JSDOM(
  "<!doctype html><html><body></body></html>",
  {
    url: "http://localhost",
  },
);

[
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "Event",
  "MouseEvent",
].forEach((key) =>
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: key === "window" ? dom.window : Reflect.get(dom.window, key),
  }),
);

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

const { render, fireEvent, cleanup } = await import("@testing-library/react");

const directory: string = path.resolve("out/editor-control-tests");

await fs.mkdir(directory, {
  recursive: true,
});

const entry: string = `import {createElement,Fragment,useState} from "react"; import {ContentField} from "${path.resolve("src/gallery/MotionGallery/ContentControls/ContentField/ContentField.tsx")}"; import {ContentDraftModule} from "${path.resolve("src/gallery/MotionGallery/ContentControls/ContentDraftModule/ContentDraftModule.ts")}"; export function Harness({controls,draft}) { const [state,setState]=useState(() => ContentDraftModule.edit({preset:"decision-fork",state:ContentDraftModule.fromPreset("decision-fork"),path:[],value:draft}));return createElement(Fragment,null,controls.map(control => createElement(ContentField,{key:control.path,control,parentPath:[],itemPath:[],preset:"decision-fork",state,onChange:setState})),createElement("output",{"data-testid":"authored-input"},JSON.stringify(state.draft))); }`;

await build({
  stdin: {
    contents: entry,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(directory, "harness.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  logLevel: "silent",
  plugins: [
    // Stock presets import their authored metadata from YAML.
    yamlPlugin,
    {
      name: "editor-css-stub",
      setup(builder) {
        builder.onLoad(
          {
            filter: /\.css$/,
          },
          () => ({
            contents: "export default {}",
            loader: "js",
          }),
        );
      },
    },
  ],
});

const { Harness } = await import(
  pathToFileURL(path.join(directory, "harness.mjs")).href
);

const label = (message: string): StockMessageDescriptor => ({
  id: `test.${message}`,
  message,
});

const text = (name: string, inputPath = name): StockControl => ({
  kind: "text",
  path: inputPath,
  label: label(name),
  minLength: 0,
  maxLength: 20,
});

function read(view: ReturnType<typeof render>): Record<string, unknown> {
  const parsed: unknown = JSON.parse(
    view.getByTestId("authored-input").textContent ?? "null",
  );
  if (!isPlainObject(parsed)) {
    throw new Error("The editor harness must serialize an authored object.");
  }
  return parsed;
}

export { render, fireEvent, cleanup, Harness, label, text, read };
