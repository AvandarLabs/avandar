import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { builtinRules } from "eslint/use-at-your-own-risk";

/*
 * Video producer renderers keep every function at 45 lines or fewer, not
 * counting blank lines and full-line comments (the repo rule in CLAUDE.md).
 *
 * It applies to every renderer directory in
 * apps/ava-video-producer/scripts/videoTheme/themeLiterals/rendererGlobs.json.
 * Functions that were already longer before the rule existed are listed in
 * apps/ava-video-producer/scripts/functionLength/longFunctionAllowlist.json,
 * keyed by `<app-relative file>#<qualified function name>` (see
 * `buildFunctionKey`). The allowlist only shrinks: an entry whose function
 * now fits, or is gone, is reported until it is deleted, and
 * `longFunctionAllowlist.test.ts` caps its size. A new long function is split
 * into helpers rather than added to it.
 */

const APP = "apps/ava-video-producer";
const APP_URL = new URL(`../${APP}/`, import.meta.url);
const RENDERER_GLOBS_FILE = new URL(
  "scripts/videoTheme/themeLiterals/rendererGlobs.json",
  APP_URL,
);
const ALLOWLIST_FILE = new URL(
  "scripts/functionLength/longFunctionAllowlist.json",
  APP_URL,
);

/** The core rule's options this guard runs with. */
export const MAX_LINES_OPTIONS = {
  max: 45,
  skipBlankLines: true,
  skipComments: true,
};

const CORE_RULE = builtinRules.get("max-lines-per-function");

function _keyName(key) {
  if (key.type === "Identifier" || key.type === "PrivateIdentifier") {
    return key.name;
  }
  return key.type === "Literal" ? String(key.value) : "<computed>";
}

function _calleeName(callee) {
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (callee.type === "MemberExpression") {
    return _keyName(callee.property);
  }
  return "<call>";
}

/** The name one function goes by in its parent node. */
function _nameOfFunction(node) {
  if (node.id?.name) {
    return node.id.name;
  }
  const parent = node.parent;
  switch (parent?.type) {
    case "VariableDeclarator":
      return parent.id.type === "Identifier" ? parent.id.name : "<pattern>";
    case "Property":
    case "MethodDefinition":
    case "PropertyDefinition":
      return _keyName(parent.key);
    case "AssignmentExpression":
      return parent.left.type === "MemberExpression"
        ? _keyName(parent.left.property)
        : _calleeName(parent.left);
    case "CallExpression":
      return `${_calleeName(parent.callee)}()`;
    case "JSXExpressionContainer":
      return parent.parent?.type === "JSXAttribute"
        ? `${parent.parent.name.name}=`
        : "<jsx>";
    case "ExportDefaultDeclaration":
      return "default";
    default:
      return "<anonymous>";
  }
}

function _isFunction(node) {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

/**
 * The allowlist key of a function: its app-relative file, then the names of
 * it and every enclosing function, outermost first.
 */
export function buildFunctionKey(appRelativeFile, node) {
  const functionNode =
    node.type === "MethodDefinition" || node.type === "Property"
      ? node.value
      : node;
  const names = [];
  for (let current = functionNode; current; current = current.parent) {
    if (_isFunction(current)) {
      names.unshift(_nameOfFunction(current));
    }
  }
  return `${appRelativeFile}#${names.join(" > ")}`;
}

/** Creates listeners that report non-allowlisted function-length violations. */
function _createCoreListeners({
  context,
  appRelativeFile,
  reportedKeys,
  allowlist,
}) {
  return CORE_RULE.create(
    Object.create(context, {
      options: { value: [MAX_LINES_OPTIONS] },
      report: {
        value: (descriptor) => {
          const key = buildFunctionKey(appRelativeFile, descriptor.node);
          reportedKeys.add(key);
          if (!allowlist.has(key)) {
            context.report({
              ...descriptor,
              data: { ...descriptor.data, key },
            });
          }
        },
      },
    }),
  );
}

/** Wraps the core rule so allowlisted functions pass and stale ones fail. */
function _createRatchetRule(allowlist) {
  return {
    meta: {
      ...CORE_RULE.meta,
      schema: [],
      messages: {
        exceed:
          "{{key}} has too many lines ({{lineCount}}). Maximum allowed is {{maxLines}}. Split it into helpers.",
        stale:
          "{{key}} is no longer a function over {{maxLines}} lines. Delete it from scripts/functionLength/longFunctionAllowlist.json.",
      },
    },
    create(context) {
      const appRelativeFile = path
        .relative(fileURLToPath(APP_URL), context.filename)
        .split(path.sep)
        .join("/");
      const reportedKeys = new Set();
      const coreListeners = _createCoreListeners({
        context,
        appRelativeFile,
        reportedKeys,
        allowlist,
      });
      return {
        ...coreListeners,
        "Program:exit": (program) => {
          allowlist.forEach((key) => {
            if (
              key.startsWith(`${appRelativeFile}#`) &&
              !reportedKeys.has(key)
            ) {
              context.report({
                node: program,
                messageId: "stale",
                data: { key, maxLines: MAX_LINES_OPTIONS.max },
              });
            }
          });
        },
      };
    },
  };
}

function _readJson(url) {
  return JSON.parse(fs.readFileSync(url, "utf8"));
}

const toAppGlob = (glob) => {
  return `${APP}/${glob}`;
};

const RENDERER_GLOBS = _readJson(RENDERER_GLOBS_FILE).filter((glob) => {
  return !glob.endsWith(".css");
});

/** The function length limit for every renderer directory. */
export const videoProducerFunctionLength = [
  {
    files: RENDERER_GLOBS.filter((glob) => {
      return !glob.startsWith("!");
    }).map(toAppGlob),
    ignores: [
      ...RENDERER_GLOBS.filter((glob) => {
        return glob.startsWith("!");
      }).map((glob) => {
        return toAppGlob(glob.slice(1));
      }),
      `${APP}/**/*.test.*`,
      `${APP}/**/__tests__/**`,
    ],
    plugins: {
      "video-producer": {
        rules: {
          "max-lines-per-function": _createRatchetRule(
            new Set(_readJson(ALLOWLIST_FILE)),
          ),
        },
      },
    },
    rules: { "video-producer/max-lines-per-function": "error" },
  },
];
