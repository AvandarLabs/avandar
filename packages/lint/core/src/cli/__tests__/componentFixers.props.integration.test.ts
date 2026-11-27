import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it } from "vitest";
import {
  collectComponentCoverage,
  createComponentRepository,
  evaluateComponentSource,
  fixComponentSource,
  SAFE,
} from "./ComponentFixerTestHelpers";

it("renames a private alias used only by the sole component parameter", () => {
  expect(
    fixComponentSource({
      source:
        "export {}; type CardProps = { count: number }; export function Card(props: CardProps) { return <div>{props.count}</div>; }",
    }),
  ).toBe(
    "export {}; type Props = { count: number }; export function Card(props: Props) { return <div>{props.count}</div>; }",
  );
});

it.each([
  "export type CardProps = { count: number }; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export { CardProps }; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; type Props = {}; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card<Props>(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } export function Other() { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } function read(props: CardProps) { return props; }",
  "type CardProps<T> = { value: T }; export function Card(props: CardProps<number>) { return <div />; }",
  "interface CardProps {} export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; const key = 'CardProps'; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export const Card = (props: CardProps) => <div />;",
  "type CardProps = {}; export function read(props: CardProps) { return props; }",
  "type CardProps = {}; const read = <T extends CardProps>(props: T) => props; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } export type Public = CardProps;",
])("preserves unsupported props contracts: %s", (source) => {
  const moduleSource = `export {}; ${source}`;
  expect(fixComponentSource({ source: moduleSource })).toBe(moduleSource);
});

it.each(["tsx", "jsx"])(
  "replaces a boolean child with an exact false-arm ternary for %s",
  (extension) => {
    expect(
      fixComponentSource({
        source:
          "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}",
        extension: extension,
      }),
    ).toBe(
      "export function Card() {\n  return <Observer>{(!ready) ? <Node /> : false}</Observer>;\n}",
    );
  },
);

it.each([
  "export function Card() { return <Observer>{count && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{0 && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{'' && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{read() && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{object.ready && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{!object.ready && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <Node value={read()} />}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <><Node /></>}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <Node>{!other && <Child />}</Node>}</Observer>; }",
  "export function Card() { return <Observer>{!ready /* keep */ && <Node />}</Observer>; }",
  "export const Card = () => <Observer>{!ready && <Node />}</Observer>;",
])("preserves unsupported JSX evaluation shapes: %s", (source) => {
  expect(
    fixComponentSource({
      source: source,
      extension: "tsx",
      rules: ["jsx-conditional-ternary"],
    }),
  ).toBe(source);
});

it.each(
  [
    false,
    true,
    0,
    "",
    null,
    undefined,
    {},
    {
      valueOf: () => {
        throw Error("coercion");
      },
    },
  ].map((value) => {
    return { value };
  }),
)(
  "preserves the precise child value and single condition read for %s",
  ({ value }) => {
    const source =
      "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}";
    const fixed = fixComponentSource({
      source: source,
      extension: "tsx",
      rules: ["jsx-conditional-ternary"],
    });
    expect(fixed).not.toBe(source);
    let reads = 0;
    const context = Object.defineProperty({}, "ready", {
      enumerable: true,
      get: () => {
        reads++;
        return value;
      },
    });
    // A getter on the VM global records every identifier evaluation.
    const execute = (text: string) => {
      const script = ts.transpileModule(text.replace("export ", ""), {
        compilerOptions: {
          jsx: ts.JsxEmit.React,
          target: ts.ScriptTarget.ESNext,
        },
      }).outputText;
      Object.assign(context, {
        Observer: "observer",
        Node: "node",
        React: {
          createElement: (
            type: unknown,
            _props: unknown,
            children: unknown,
          ) => {
            return type === "observer" ? children : "rendered-node";
          },
        },
      });
      return runInNewContext(`${script}\nCard();`, context);
    };
    expect(execute(fixed)).toBe(execute(source));
    expect(reads).toBe(2);
  },
);

it.each([0, "", false, null, undefined])(
  "retains unproven scalar children exactly: %s",
  (value) => {
    const source =
      "export function Card() { return <Observer>{count && <Node />}</Observer>; }";
    const fixed = fixComponentSource({
      source: source,
      extension: "tsx",
      rules: ["jsx-conditional-ternary"],
    });
    expect(
      evaluateComponentSource({ source: fixed, context: { count: value } }),
    ).toBe(value);
  },
);

it.each(["tsx", "jsx", "ts", "js"])(
  "proves only file-syntax-specific component capabilities for %s",
  async (extension) => {
    const directory = createComponentRepository(extension);
    const result = await collectComponentCoverage({
      directory: directory,
      extension: extension,
    });
    SAFE.forEach(([ruleId, capability]) => {
      if (ruleId === "avlint-ts-010" && ["jsx", "js"].includes(extension)) {
        return;
      }
      const supported =
        ruleId === "avlint-ts-010"
          ? extension === "tsx"
          : ["tsx", "jsx"].includes(extension);
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: supported ? "enforced" : "fallback",
        }),
      );
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability: "unsupported-shapes",
          state: "fallback",
        }),
      );
      expect(result.summaries).toContainEqual(
        expect.objectContaining({ ruleId, state: "fallback" }),
      );
    });
    expect(
      readFileSync(join(directory, `src/reviewed.${extension}`), "utf8"),
    ).toBe("export {};\n");
  },
);
