import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { getComponentTokenReadsFromProgram } from "./getComponentTokenReadsFromProgram";

const COMPONENT_TYPES = `
export type ResolvedVideoComponents = {
  Cursor: { scale: number; shadow: string; pressDepth: number; trailLimit: number };
  Orb: { ringWidth: number };
  Thesis: { rowGap: number };
  WindowTilt: { rotateY: number; perspective: number };
};
export type WindowStage = { tilt: ResolvedVideoComponents["WindowTilt"] };
`;

function _reads(sources: Readonly<Record<string, string>>): string[] {
  const files = new Map(
    Object.entries({ "types.ts": COMPONENT_TYPES, ...sources }).map(
      ([name, source]) => {
        return [`/audit/${name}`, source];
      },
    ),
  );
  const options: ts.CompilerOptions = {
    noLib: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host: ts.CompilerHost = {
    ...ts.createCompilerHost(options),
    directoryExists: (directory) => {
      return directory === "/audit";
    },
    fileExists: (file) => {
      return files.has(file);
    },
    readFile: (file) => {
      return files.get(file);
    },
    getSourceFile: (file, languageVersion) => {
      const source = files.get(file);
      return source === undefined
        ? undefined
        : ts.createSourceFile(file, source, languageVersion, true);
    },
  };
  const program = ts.createProgram([...files.keys()], options, host);
  return getComponentTokenReadsFromProgram({
    program,
    sourceFiles: [...files.keys()].map((file) => {
      return program.getSourceFile(file)!;
    }),
  });
}

test("a hook call alone credits no unrelated properties, strings, or comments", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    import { useVideoProps } from "./useVideoTheme";
    const cursor = useVideoProps("Cursor", {});
    const unrelated = { scale: 2, shadow: "none" };
    const text = "cursor.pressDepth";
    // cursor.trailLimit
  `,
    }),
    [],
  );
});

test("component reads retain their owner across separate lexical scopes", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    import { useVideoProps } from "./useVideoTheme";
    function Cursor() { const theme = useVideoProps("Cursor", {}); return theme.scale; }
    function Orb() { const theme = useVideoProps("Orb", {}); return theme.ringWidth; }
    function unrelated(theme: { shadow: number }) { return theme.shadow; }
  `,
    }),
    ["components.Cursor.scale", "components.Orb.ringWidth"],
  );
});

test("aliases, renamed bindings, bracket reads, and direct reads retain their owner", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    import { useVideoProps as readProps } from "./useVideoTheme";
    const cursor = readProps("Cursor", {});
    const alias = cursor;
    const { shadow: cursorShadow } = alias;
    const scale = alias["scale"];
    const gap = readProps("Thesis", {}).rowGap;
    alias.pressDepth = 1;
  `,
    }),
    [
      "components.Cursor.scale",
      "components.Cursor.shadow",
      "components.Thesis.rowGap",
    ],
  );
});

test("typed helpers and nested stage properties preserve cross-file ownership", () => {
  assert.deepEqual(
    _reads({
      "helpers.ts": `
    import type { ResolvedVideoComponents as Components, WindowStage } from "./types";
    export function cursor(value: Components["Cursor"]) { return value.pressDepth; }
    export function window(stage: WindowStage) {
      const { tilt } = stage;
      return tilt.rotateY + stage.tilt.perspective;
    }
  `,
    }),
    [
      "components.Cursor.pressDepth",
      "components.WindowTilt.perspective",
      "components.WindowTilt.rotateY",
    ],
  );
});

test("type signatures and ambient declarations do not credit runtime reads", () => {
  assert.deepEqual(
    _reads({
      "declarations.ts": `
    import type { ResolvedVideoComponents as Components } from "./types";
    type Renderer = ({ scale }: Components["Cursor"]) => void;
    declare function render({ shadow }: Components["Cursor"]): void;
  `,
    }),
    [],
  );
});

test("component subsets preserve the owner of delegated property reads", () => {
  assert.deepEqual(
    _reads({
      "subset.ts": `
    import type { ResolvedVideoComponents as Components } from "./types";
    export function cursor(value: Pick<Components["Cursor"], "pressDepth">) {
      return value.pressDepth;
    }
  `,
    }),
    ["components.Cursor.pressDepth"],
  );
});
