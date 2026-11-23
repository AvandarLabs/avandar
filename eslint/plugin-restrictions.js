import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Import specifiers plugin code may use, as regex fragments joined into one
 * allowlist: relative files, the plugin SDK packages, React, and the approved
 * npm packages. Keep this in sync with `APPROVED_PLUGIN_DEPENDENCIES` in
 * `@avandar/plugin-manifest`: a plugin may only depend on the packages the
 * manifest approves, and must not reach into app code.
 * `plugin-restrictions.test.js` fails when the two drift apart.
 *
 * Every entry other than relative files, `react/jsx-runtime` (the automatic
 * JSX runtime), `@avandar/plugin-ui/charts` (the chart building blocks), and
 * the `date-fns` subpaths must be an exact package name.
 */
export const APPROVED_PLUGIN_IMPORT_PATTERNS = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
  "@avandar/plugin-ui/charts$",
  "react$",
  "react/jsx-runtime$",
  "simple-statistics$",
  "d3-array$",
  "date-fns(/.*)?$",
];

/**
 * Regex matching every import specifier that is NOT approved for plugin code,
 * negated from `APPROVED_PLUGIN_IMPORT_PATTERNS` for `no-unapproved-imports`
 * and `plugin-restrictions.test.js`.
 */
export const UNAPPROVED_PLUGIN_IMPORT_REGEX = `^(?!(?:${APPROVED_PLUGIN_IMPORT_PATTERNS.join("|")}))`;

const UNAPPROVED_IMPORT_MATCHER = new RegExp(
  UNAPPROVED_PLUGIN_IMPORT_REGEX,
  "u",
);

const UNAPPROVED_IMPORT_MESSAGE =
  "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, @avandar/plugin-ui/charts, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SHARED_ALLOWED_DIRECTORIES = [
  resolve(REPO_ROOT, "node_modules"),
  resolve(REPO_ROOT, "packages/web/plugin-sdk"),
  resolve(REPO_ROOT, "packages/web/plugin-ui"),
];

const WORKSPACE_PARENT_DIRECTORIES = [
  "apps",
  "packages/shared",
  "packages/web",
  "packages/node",
  "plugins",
];

const JSONC_TOKEN_REGEX = /("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/.*$/gm;

function _readPathAliases() {
  const tsconfigPath = join(REPO_ROOT, "tsconfig.base.json");
  if (!existsSync(tsconfigPath)) {
    return [];
  }
  const strippedJson = readFileSync(tsconfigPath, "utf8").replace(
    JSONC_TOKEN_REGEX,
    (_match, quotedString) => {
      return quotedString ?? "";
    },
  );
  const parsed = JSON.parse(strippedJson);
  const rawPaths = parsed?.compilerOptions?.paths ?? {};
  return Object.entries(rawPaths)
    .filter(([, targets]) => {
      return Array.isArray(targets) && typeof targets[0] === "string";
    })
    .map(([pattern, [firstTarget]]) => {
      const isWildcard = pattern.endsWith("*");
      return {
        isWildcard,
        prefix: isWildcard ? pattern.slice(0, -1) : pattern,
        targetPrefix: isWildcard ? firstTarget.replace(/\*$/, "") : firstTarget,
      };
    })
    .sort((left, right) => {
      return right.prefix.length - left.prefix.length;
    });
}

function _readWorkspacePackages() {
  const entries = WORKSPACE_PARENT_DIRECTORIES.flatMap((parentRelativePath) => {
    const parentDirectory = join(REPO_ROOT, parentRelativePath);
    if (!existsSync(parentDirectory)) {
      return [];
    }
    return readdirSync(parentDirectory, { withFileTypes: true })
      .filter((entry) => {
        return entry.isDirectory();
      })
      .flatMap((entry) => {
        const packageDirectory = join(parentDirectory, entry.name);
        const packageJsonPath = join(packageDirectory, "package.json");
        if (!existsSync(packageJsonPath)) {
          return [];
        }
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return typeof packageJson?.name === "string"
          ? [[packageJson.name, packageDirectory]]
          : [];
      });
  });
  return new Map(entries);
}

const PATH_ALIASES = _readPathAliases();
const WORKSPACE_PACKAGES = _readWorkspacePackages();

function _getPackageNameFromSpecifier(specifier) {
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) {
    return parts[0] && parts[1] ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return parts[0] ?? specifier;
}

function _getAliasTargetFromSpecifier(specifier) {
  const matchedAlias = PATH_ALIASES.find((alias) => {
    return alias.isWildcard
      ? specifier.startsWith(alias.prefix)
      : specifier === alias.prefix;
  });
  if (!matchedAlias) {
    return undefined;
  }
  if (!matchedAlias.isWildcard) {
    return resolve(REPO_ROOT, matchedAlias.targetPrefix);
  }
  const suffix = specifier.slice(matchedAlias.prefix.length);
  return resolve(REPO_ROOT, matchedAlias.targetPrefix, suffix);
}

function _getRepoTargetFromSpecifier(options) {
  const { filePath, rawSpecifier } = options;
  const cleanSpecifier = rawSpecifier.replace(/[?#].*$/, "");
  if (cleanSpecifier.length === 0) {
    return undefined;
  }
  if (
    cleanSpecifier === "." ||
    cleanSpecifier === ".." ||
    cleanSpecifier.startsWith("./") ||
    cleanSpecifier.startsWith("../")
  ) {
    return resolve(dirname(filePath), cleanSpecifier);
  }
  if (cleanSpecifier.startsWith("/")) {
    return cleanSpecifier.startsWith(REPO_ROOT)
      ? resolve(cleanSpecifier)
      : resolve(REPO_ROOT, `.${cleanSpecifier}`);
  }
  const aliasTarget = _getAliasTargetFromSpecifier(cleanSpecifier);
  if (aliasTarget !== undefined) {
    return aliasTarget;
  }
  return WORKSPACE_PACKAGES.get(_getPackageNameFromSpecifier(cleanSpecifier));
}

function _getStaticStringFromNode(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (
    node?.type === "TemplateLiteral" &&
    node.expressions?.length === 0 &&
    typeof node.quasis?.[0]?.value?.cooked === "string"
  ) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

function _makeSpecifierVisitors(onSpecifier) {
  const checkSourceNode = (node) => {
    if (typeof node.source?.value === "string") {
      onSpecifier(node, node.source.value.trim());
    }
  };
  return {
    ImportDeclaration: checkSourceNode,
    ExportNamedDeclaration: checkSourceNode,
    ExportAllDeclaration: checkSourceNode,
    TSImportEqualsDeclaration: (node) => {
      const expression = node.moduleReference?.expression;
      if (
        node.moduleReference?.type === "TSExternalModuleReference" &&
        typeof expression?.value === "string"
      ) {
        onSpecifier(node, expression.value.trim());
      }
    },
    ImportExpression: (node) => {
      const specifier = _getStaticStringFromNode(node.source);
      if (specifier !== undefined) {
        onSpecifier(node, specifier.trim());
      }
    },
    CallExpression: (node) => {
      const specifier = _getStaticStringFromNode(node.arguments?.[0]);
      if (
        node.callee?.type === "Identifier" &&
        node.callee.name === "require" &&
        specifier !== undefined
      ) {
        onSpecifier(node, specifier.trim());
      }
    },
  };
}

const _noUnapprovedImportsRule = {
  meta: {
    type: "problem",
    schema: [],
  },
  create: (context) => {
    return _makeSpecifierVisitors((node, specifier) => {
      if (UNAPPROVED_IMPORT_MATCHER.test(specifier)) {
        context.report({ node, message: UNAPPROVED_IMPORT_MESSAGE });
      }
    });
  },
};

const _noRestrictedPathsRule = {
  meta: {
    type: "problem",
    schema: [],
  },
  create: (context) => {
    const absoluteFilePath = resolve(
      context.cwd ?? process.cwd(),
      context.filename,
    );
    const segments = relative(REPO_ROOT, absoluteFilePath).split(sep);
    const pluginName = segments[1];
    if (segments[0] !== "plugins" || !pluginName || segments.length < 3) {
      return {};
    }
    const pluginDirectory = resolve(REPO_ROOT, "plugins", pluginName);
    const allowedDirectories = [pluginDirectory, ...SHARED_ALLOWED_DIRECTORIES];
    const message = `A plugin may import only files inside plugins/${pluginName}, @avandar/plugin-sdk, @avandar/plugin-ui, and approved npm packages.`;
    return _makeSpecifierVisitors((node, specifier) => {
      const targetPath = _getRepoTargetFromSpecifier({
        filePath: absoluteFilePath,
        rawSpecifier: specifier,
      });
      if (targetPath === undefined) {
        return;
      }
      const isAllowed = allowedDirectories.some((directoryPath) => {
        return (
          targetPath === directoryPath ||
          targetPath.startsWith(`${directoryPath}${sep}`)
        );
      });
      if (!isAllowed) {
        context.report({ node, message });
      }
    });
  },
};

/**
 * Oxlint JS plugin enforcing Avandar's plugin import allowlist and folder
 * isolation across `plugins/**`. Loaded by `.oxlintrc.json` only on files
 * inside `plugins/` so non-plugin files pay no rule overhead.
 */
export default {
  meta: { name: "plugin-restrictions" },
  rules: {
    "no-unapproved-imports": _noUnapprovedImportsRule,
    "no-restricted-paths": _noRestrictedPathsRule,
  },
};
