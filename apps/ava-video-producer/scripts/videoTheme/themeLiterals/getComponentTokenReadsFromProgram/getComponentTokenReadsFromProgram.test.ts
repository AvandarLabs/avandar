import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { makeMap } from "@avandar/utils";
import ts from "typescript";
import { getComponentTokenReadsFromProgram } from "./getComponentTokenReadsFromProgram";

const AUDIT_ROOT = new URL("../../../../src/videoTheme/", import.meta.url);
const HOOK_SOURCE = `
export function useVideoProps({ name, props }) { return props; }
`;

const COMPONENT_TYPES = `
export type ResolvedVideoComponents = {
  BarComparison: { unitScale: number };
  Cursor: { scale: number; shadow: string; pressDepth: number; trailLimit: number };
  Orb: { ringWidth: number };
  Thesis: { rowGap: number };
  WindowTilt: { rotateY: number; perspective: number };
};
export type WindowStage = { tilt: ResolvedVideoComponents["WindowTilt"] };
export type ResolvedVideoTheme = { components: ResolvedVideoComponents };
`;

function _createFilesFromSources(
  sources: Readonly<Record<string, string>>,
): Map<string, string> {
  return makeMap(
    Object.entries({
      "videoTheme.types.ts": COMPONENT_TYPES,
      "types.ts": `export type {
        ResolvedVideoComponents, WindowStage, ResolvedVideoTheme
      } from "./videoTheme.types";`,
      "videoThemeHelpers.ts": HOOK_SOURCE,
      ...sources,
    }),
    {
      keyFn: ([name]) => {
        return fileURLToPath(new URL(name, AUDIT_ROOT));
      },
      valueFn: ([, source]) => {
        return source;
      },
    },
  );
}

function _reads(sources: Readonly<Record<string, string>>): string[] {
  const files = _createFilesFromSources(sources);
  const options: ts.CompilerOptions = {
    noLib: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host: ts.CompilerHost = {
    ...ts.createCompilerHost(options),
    directoryExists: (directory) => {
      return [...files.keys()].some((file) => {
        return file.startsWith(`${directory}/`);
      });
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
    import { useVideoProps } from "./videoThemeHelpers";
    const cursor = useVideoProps({ name: "Cursor", props: {} });
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
    import { useVideoProps } from "./videoThemeHelpers";
    function Cursor() { const theme = useVideoProps({ name: "Cursor", props: {} }); return theme.scale; }
    function Orb() { const theme = useVideoProps({ name: "Orb", props: {} }); return theme.ringWidth; }
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
    import { useVideoProps as readProps } from "./videoThemeHelpers";
    const cursor = readProps({ name: "Cursor", props: {} });
    const alias = cursor;
    const { shadow: cursorShadow } = alias;
    const scale = alias["scale"];
    const gap = readProps({ name: "Thesis", props: {} }).rowGap;
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

test("a hook options object does not credit a name nested under props", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    import { useVideoProps } from "./videoThemeHelpers";
    const unrelated = useVideoProps({ props: { name: "Cursor" } });
    const text = unrelated.scale;
  `,
    }),
    [],
  );
});

test("re-exported namespace imports retain the canonical hook owner", () => {
  assert.deepEqual(
    _reads({
      "barrel.ts": `
    export { useVideoProps as readProps } from "./videoThemeHelpers";
  `,
      "view.tsx": `
    import * as theme from "./barrel";
    const cursor = theme.readProps({ name: "Cursor", props: {} });
    const scale = cursor.scale;
  `,
    }),
    ["components.Cursor.scale"],
  );
});

test("an unrelated same-named import credits no component reads", () => {
  assert.deepEqual(
    _reads({
      "unrelated/videoThemeHelpers.ts": HOOK_SOURCE,
      "view.tsx": `
    import { useVideoProps } from "./unrelated/videoThemeHelpers";
    const cursor = useVideoProps({ name: "Cursor", props: {} });
    const scale = cursor.scale;
  `,
    }),
    [],
  );
});

test("a same-named object member credits no component reads", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    const fake = { useVideoProps(options) { return { scale: 1 }; } };
    const cursor = fake.useVideoProps({ name: "Cursor", props: {} });
    const scale = cursor.scale;
  `,
    }),
    [],
  );
});

test("a whole resolved theme retains direct component-property readers", () => {
  assert.deepEqual(
    _reads({
      "view.tsx": `
    import type { ResolvedVideoTheme as Theme } from "./types";
    type PanelInput = { theme: Theme };
    export function scale(theme: PanelInput["theme"]) {
      return theme.components.BarComparison.unitScale;
    }
  `,
    }),
    ["components.BarComparison.unitScale"],
  );
});

test("a lookalike component-map type credits no direct token readers", () => {
  assert.deepEqual(
    _reads({
      "unrelated/videoTheme.types.ts": COMPONENT_TYPES,
      "view.tsx": `
    import type { ResolvedVideoTheme } from "./unrelated/videoTheme.types";
    export function scale(theme: ResolvedVideoTheme) {
      return theme.components.BarComparison.unitScale;
    }
  `,
    }),
    [],
  );
});

test("a base theme initializer credits no direct component-property readers", () => {
  assert.deepEqual(
    _reads({
      "base.ts": `
    import type { ResolvedVideoTheme } from "./types";
    const base: ResolvedVideoTheme = {
      components: { BarComparison: { unitScale: 0.5 } },
    };
  `,
    }),
    [],
  );
});
