import { Linter } from "eslint";
import type { ESLint } from "eslint";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import plugin from "../../index";

const linter = new Linter();
const eslintPlugin = plugin as unknown as ESLint.Plugin;

function _fix(source: string, name: string) {
  const config = [{
    plugins: { avandar: eslintPlugin },
    rules: { [`avandar/${name}`]: "error" as const },
  }];
  const result = linter.verifyAndFix(source, config);
  expect(result.messages).toEqual([]);
  expect(linter.verifyAndFix(result.output, config)).toMatchObject({
    output: result.output, fixed: false, messages: [],
  });
  return result.output;
}

it.each([
  ["const _read = () => { consume(); return 1; }; _read();", "function _read() { consume(); return 1; } _read();"],
  ["const _read = (value) => { consume(value); return value; }; _read(1);", "function _read(value) { consume(value); return value; } _read(1);"],
  ["const _read = function(value) { return value; }; _read(1);", "function _read(value) { return value; } _read(1);"],
])("converts directly called top-level functions: %s", (source, output) => {
  expect(_fix(source, "top-level-function-declarations")).toBe(output);
});

it.each([
  "export const read = function() { return 1; }; read();",
  "const _read = function() { return 1; }; export { _read };",
  "_read(); const _read = function() { return 1; };",
  "before(); const _read = function() { return 1; }; function before() { return _read(); }",
  "const _read = function() { return _read(); }; _read();",
  "const _read = () => { consume(); return this.value; }; _read();",
  "const _read = () => { consume(); return arguments; }; _read();",
  "const _read = function() { return 1; }; new _read();",
  "const _read = function() { return 1; }; console.log(_read.name);",
  "const _read = function() { return 1; }; consume(_read);",
  "const _read = function() { return 1; }; eval('_read()'); _read();",
  "const _read = function() { return 1; }; const contract = '_read'; _read();",
  "const _read = function named() { return named(); }; _read();",
  "const _read = async () => 1; _read();",
  "const _read = () => 1, other = 2; _read();",
  "let _read = () => 1; _read();",
  "function outer() { const read = () => 1; read(); }",
  "const _read = /* retain */ () => 1; _read();",
  "const _read = () => { function nested() { return 1; } return nested(); }; _read();",
  "const _read = () => { const nested = () => 1; return nested(); }; _read();",
  "const _read = () => 1; _read();",
  "const _read = () => { return 1; }; _read();",
  "const _read = () => { if (flag) consume(); return 1; }; _read();",
  "const _read = () => { /* Keep once. */ consume(); return 1; }; _read();",
  "const _read = (callback = () => 1) => { consume(); return callback(); }; _read();",
])("preserves unsupported top-level function contracts: %s", (source) => {
  expect(_fix(source, "top-level-function-declarations")).toBe(source);
});

it("preserves the temporal dead zone reached indirectly before initialization", () => {
  const source = "before(); const read = function() { return 7; }; function before() { return read(); }";
  const fixed = _fix(source, "top-level-function-declarations");
  expect(fixed).toBe(source);
  expect(() => { runInNewContext(fixed); }).toThrow("Cannot access 'read' before initialization");
});

it("preserves hoisted nested calls reached through another local function", () => {
  const source = "function outer() { return before(); function read() { return 7; } function before() { return read(); } } outer();";
  const fixed = _fix(source, "nested-arrow-functions");
  expect(fixed).toBe(source);
  expect(runInNewContext(fixed)).toBe(7);
});

it.each([
  ["function read() { return 1; } read.name;", "read"],
  ["function outer() { function read() { return 1; } return new read() instanceof read; } outer();", true],
  ["function read() { return 7; } eval('read()');", 7],
])("preserves runtime identity, constructor, and eval contracts: %s", (source, output) => {
  const fixed = _fix(_fix(source as string, "private-helper-prefix"), "nested-arrow-functions");
  expect(fixed).toBe(source);
  expect(runInNewContext(fixed)).toBe(output);
});

it("converts a nested declaration above its direct calls", () => {
  expect(_fix("function outer() { function read(value) { return value; } return read(1); }", "nested-arrow-functions"))
    .toBe("function outer() { const read = (value) => { return value; }; return read(1); }");
});

it.each([
  "function read() { return 1; } read();",
  "function outer() { return read(); function read() { return 1; } }",
  "function outer() { before(); function read() { return 1; } function before() { return read(); } }",
  "function outer() { function read() { return read(); } return read(); }",
  "function outer() { function read() { return this; } return read(); }",
  "function outer() { function read() { return arguments; } return read(); }",
  "function outer() { function read() { return new.target; } return read(); }",
  "function outer() { function read() { return 1; } return new read(); }",
  "function outer() { function read() { return 1; } return read.name; }",
  "function outer() { function read() { return 1; } return read; }",
  "function outer() { function read() { return 1; } eval('read()'); return read(); }",
  "function outer() { if (flag) { function read() { return 1; } read(); } }",
  "function outer() { function* read() { yield 1; } return read(); }",
  "function outer() { async function read() { return 1; } return read(); }",
  "function outer(read) { function read() { return 1; } return read(); }",
  "function outer() { const object = { get read() { return 1; }, readMethod() { return 2; } }; }",
  "function outer() { function read() { const nested = () => 1; return nested(); } return read(); }",
])("preserves unsupported nested function contracts: %s", (source) => {
  expect(_fix(source, "nested-arrow-functions")).toBe(source);
});

it.each([
  ["function read() { return 1; } export function load() { return read(); }", "function _read() { return 1; } export function load() { return _read(); }"],
  ["const read = function() { return 1; }; export function load() { return read(); }", "const _read = function() { return 1; }; export function load() { return _read(); }"],
])("renames private helpers and their scope-resolved calls: %s", (source, output) => {
  expect(_fix(source, "private-helper-prefix")).toBe(output);
});

it.each([
  "export function read() { return 1; } read();",
  "function read() { return 1; } export { read };",
  "function Read() { return 1; } Read();",
  "function _read() { return 1; } _read();",
  "function read() { return 1; } const _read = 2; read();",
  "function read() { return 1; } export function load() { return read() + _read(); }",
  "function read() { return 1; } function load(_read) { return read(); }",
  "function read() { return 1; } const object = { read };",
  "function read() { return 1; } const object = { value: read };",
  "function read() { return 1; } const object = { [read]: 1 };",
  "function read() { return 1; } const contract = 'read'; read();",
  "function read() { return 1; } const contract = `read`; read();",
  "function read() { return 1; } eval('read()'); read();",
  "function read() { return 1; } Function('return read()')(); read();",
  "function read() { return 1; } console.log(read.name);",
  "function read() { return arguments.callee.name; } read();",
  "function read() { return 1; } new read();",
  "function read() { return 1; } read = other; read();",
  "function read() { return 1; } export default read;",
  "const read = function named() { return named.name; }; read();",
])("preserves private helper exports, collisions, and reflective contracts: %s", (source) => {
  const module = source + " export function invokePrivate() { return read(); }";
  expect(_fix(module, "private-helper-prefix")).toBe(module);
});

it.each([
  "function read() { return 1; } read();",
  "const read = () => 1; read();",
  "function read() { function nested() { return 1; } return nested(); } export function load() { return read(); }",
  "function read() { const nested = () => 1; return nested(); } export function load() { return read(); }",
  "function read() { return 1; } const marker = 1; export function load() { return read(); }",
  "function read() { return 1; } export function load() { const nested = () => 1; return read() + nested(); }",
  "function read() { return 1; } export function load() { function nested() { return 1; } return read() + nested(); }",
])("keeps private rename ownership disjoint from function conversions: %s", (source) => {
  expect(_fix(source, "private-helper-prefix")).toBe(source);
});

it.each([
  "const contract = 'read'; function read() { return 1; } export function load() { return read(); }",
  "const contract = 'r\\u0065ad'; function read() { return 1; } export function load() { return read(); }",
  "const contract = `read`; function read() { return 1; } export function load() { return read(); }",
  "eval(code); function read() { return 1; } export function load() { return read(); }",
  "function read() { return read(); } export function load() { return read(); }",
  "function read() { return 1; } export function load() { return read.name; }",
  "function read() { return 1; } export function load() { return ({ value: read }); }",
  "function read() { return 1; } export function load() { return ({ [read]: 1 }); }",
])("preserves adjacent private helper string, eval, recursion, and escape contracts: %s", (source) => {
  expect(_fix(source, "private-helper-prefix")).toBe(source);
});
