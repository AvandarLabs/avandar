import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformAsync, types } from "@babel/core";
import { build, context, transform } from "esbuild";
import postcss from "postcss";
import mantine from "postcss-preset-mantine";
import simpleVars from "postcss-simple-vars";
import tailwind from "tailwindcss";
import { productRoot, productSourcePath } from "./lib/product-source.mjs";
import { requireLicense } from "./require-license.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = productRoot(root);
const adapterRoot = path.join(root, "avandar-adapter");
const isProduct = (file) =>
  ["src", "shared", "packages", "public"].some((folder) =>
    file.startsWith(path.join(source, folder) + path.sep),
  );
const workspace = {
  ui: "packages/web/ui/src",
  hooks: "packages/web/hooks/src",
  "browser-utils": "packages/web/browser-utils/src",
  utils: "packages/shared/utils/src",
  models: "packages/shared/models/src",
  modules: "packages/shared/modules/src",
  logger: "packages/shared/logger/src",
  "query-hooks": "packages/web/query-hooks/src",
  clients: "packages/shared/clients/src",
};

async function readAliases() {
  const aliases = {};
  for (const file of await fs.readdir(adapterRoot)) {
    if (file.endsWith("-aliases.json"))
      Object.assign(
        aliases,
        JSON.parse(await fs.readFile(path.join(adapterRoot, file), "utf8")),
      );
  }
  return aliases;
}

async function locate(base) {
  for (const candidate of [
    base,
    ...[".tsx", ".ts", ".jsx", ".js", ".json"].map(
      (extension) => base + extension,
    ),
    ...["index.tsx", "index.ts", "index.js"].map((file) =>
      path.join(base, file),
    ),
  ]) {
    if ((await fs.stat(candidate).catch(() => null))?.isFile())
      return candidate;
  }
  throw new Error(`Source import not found: ${base}`);
}

function remember(imported, file, contents) {
  const relative = productSourcePath(source, file);
  imported.set(relative, {
    path: relative,
    sha256: createHash("sha256").update(contents).digest("hex"),
  });
}

async function resolveSource(args, aliases) {
  if (args.path === "@tanstack/react-router")
    return { path: path.join(adapterRoot, "shims/router.tsx") };
  if (aliases[args.path])
    return { path: await locate(path.resolve(root, aliases[args.path])) };
  if (args.path.startsWith("@/"))
    return { path: await locate(path.join(source, "src", args.path.slice(2))) };
  if (args.path.startsWith("$/"))
    return {
      path: await locate(path.join(source, "shared", args.path.slice(2))),
    };
  if (args.path.startsWith("@product-assets/"))
    return {
      path: await locate(path.join(source, "public", args.path.slice(16))),
    };
  for (const [name, folder] of Object.entries(workspace))
    for (const prefix of [`@${name}`, `@avandar/${name}`]) {
      if (args.path === prefix || args.path.startsWith(prefix + "/"))
        return {
          path: await locate(
            path.join(
              source,
              folder,
              args.path === prefix
                ? "index.ts"
                : args.path.slice(prefix.length + 1),
            ),
          ),
        };
    }
  if (isProduct(args.importer) && args.path.startsWith("."))
    return {
      path: await locate(path.resolve(path.dirname(args.importer), args.path)),
    };
  // Let esbuild resolve installed dependencies from their actual importer.
  // Re-resolving them with a different importer can alter CommonJS interop.
  return undefined;
}

async function compileSource(args, aliases, imported) {
  if (!isProduct(args.path) && !args.path.startsWith(adapterRoot + path.sep))
    return undefined;
  const bytes = await fs.readFile(args.path);
  if (isProduct(args.path)) remember(imported, args.path, bytes);
  for (const [key, target] of Object.entries(aliases)) {
    const relative = key.startsWith("@/")
      ? "src/" + key.slice(2)
      : key.startsWith("$/")
        ? "shared/" + key.slice(2)
        : null;
    if (
      relative &&
      args.path.replace(/\.[jt]sx?$/, "") === path.join(source, relative)
    )
      return {
        contents: `export * from ${JSON.stringify(path.join(root, target))};`,
        loader: "js",
        resolveDir: root,
      };
  }
  const typed = await transform(bytes.toString(), {
    loader: args.path.endsWith("x") ? "tsx" : "ts",
    jsx: "preserve",
    target: "esnext",
  });
  const compiled = await transformAsync(typed.code, {
    filename: args.path,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx"] },
    plugins: [
      ["@lingui/babel-plugin-lingui-macro", { descriptorFields: "message" }],
    ],
  });
  return {
    contents: compiled.code,
    loader: "jsx",
    resolveDir: path.dirname(args.path),
  };
}

async function compileCss(args, imported) {
  const bytes = await fs.readFile(args.path);
  if (isProduct(args.path)) remember(imported, args.path, bytes);
  const variables = {
    "mantine-breakpoint-xs": "36em",
    "mantine-breakpoint-sm": "48em",
    "mantine-breakpoint-md": "62em",
    "mantine-breakpoint-lg": "75em",
    "mantine-breakpoint-xl": "88em",
  };
  const processed = await postcss([
    simpleVars({ variables }),
    mantine(),
  ]).process(bytes.toString(), { from: args.path });
  return {
    contents: processed.css,
    loader: args.path.endsWith(".module.css") ? "local-css" : "css",
    resolveDir: path.dirname(args.path),
  };
}

function normalizeSqlKeywordSet(objectPath) {
  const properties = objectPath.node.properties;
  // The parser's reserved-word sets contain repeated true entries.
  // Normalize only these pure sets, preserving other object semantics.
  const isKeywordSet = properties.every(
    (property) =>
      types.isObjectProperty(property) &&
      !property.computed &&
      (types.isIdentifier(property.key) ||
        types.isStringLiteral(property.key)) &&
      /^[A-Z][A-Z0-9_-]*$/.test(property.key.name ?? property.key.value) &&
      (types.isBooleanLiteral(property.value, { value: true }) ||
        (types.isUnaryExpression(property.value, { operator: "!" }) &&
          types.isNumericLiteral(property.value.argument, { value: 0 }))),
  );
  if (!isKeywordSet) {
    return;
  }
  const keywords = new Set();
  objectPath.node.properties = properties.filter((property) => {
    const keyword = property.key.name ?? property.key.value;
    if (keywords.has(keyword)) {
      return false;
    }
    keywords.add(keyword);
    return true;
  });
}

async function compileSqlParser(args) {
  const compiled = await transformAsync(await fs.readFile(args.path, "utf8"), {
    filename: args.path,
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [
      () => ({ visitor: { ObjectExpression: normalizeSqlKeywordSet } }),
    ],
  });
  return {
    contents: compiled.code,
    loader: "js",
    resolveDir: path.dirname(args.path),
  };
}

async function loadAsset(args, imported) {
  if (!isProduct(args.path)) return undefined;
  const bytes = await fs.readFile(args.path);
  remember(imported, args.path, bytes);
  return {
    contents: bytes,
    loader: args.path.endsWith(".json") ? "json" : "dataurl",
    resolveDir: path.dirname(args.path),
  };
}

async function finishBuild(result, imported, outputDirectory, onBuilt) {
  if (result.errors.length) return;
  const content = [
    "avandar-adapter/**/*.{ts,tsx}",
    ...Array.from(imported.keys())
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => path.join(source, file)),
  ];
  const utilities = await postcss([
    tailwind({ content, corePlugins: { preflight: false } }),
  ]).process("@tailwind utilities;", { from: undefined });
  await fs.appendFile(path.join(outputDirectory, "product.css"), utilities.css);
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim();
  const files = [...imported.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  const jsSha256 = createHash("sha256")
    .update(await fs.readFile(path.join(outputDirectory, "product.js")))
    .digest("hex");
  await fs.writeFile(
    path.join(outputDirectory, "build.json"),
    JSON.stringify(
      {
        repository: "AvandarLabs/avandar",
        revision,
        files,
        sourceFiles: files.length,
        inputs: Object.keys(result.metafile.inputs).length,
        jsSha256,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Built Avandar components directly from ${files.length} worktree source files at ${revision}.`,
  );
  await onBuilt();
}

function createSourcePlugin(aliases, outputDirectory, onBuilt) {
  const imported = new Map();
  let currentAliases = aliases;
  return {
    name: "avandar-source",
    setup(builder) {
      builder.onStart(async () => {
        imported.clear();
        currentAliases = await readAliases();
      });
      builder.onResolve({ filter: /.*/ }, (args) =>
        resolveSource(args, currentAliases),
      );
      builder.onLoad(
        { filter: /node-sql-parser[\\/]index\.js$/ },
        compileSqlParser,
      );
      builder.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
        const compiled = await compileSource(args, currentAliases, imported);
        if (compiled && args.path === path.join(adapterRoot, "index.tsx")) {
          compiled.watchDirs = [adapterRoot];
          compiled.watchFiles = (await fs.readdir(adapterRoot))
            .filter((file) => file.endsWith("-aliases.json"))
            .map((file) => path.join(adapterRoot, file));
        }
        return compiled;
      });
      builder.onLoad({ filter: /\.css$/ }, (args) =>
        compileCss(args, imported),
      );
      builder.onLoad({ filter: /\.(json|png|svg)$/ }, (args) =>
        loadAsset(args, imported),
      );
      builder.onEnd((result) =>
        finishBuild(result, imported, outputDirectory, onBuilt),
      );
    },
  };
}

function createBuildOptions(aliases, outputDirectory, onBuilt) {
  return {
    absWorkingDir: root,
    entryPoints: ["avandar-adapter/index.tsx"],
    outfile: path.join(outputDirectory, "product.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    jsx: "automatic",
    minify: false,
    metafile: true,
    banner: {
      js: `import * as ReactRuntime from 'react'; import * as ReactDOMRuntime from 'react-dom'; import * as JSXRuntime from 'react/jsx-runtime'; const require=(id)=>{ if(id==='react')return ReactRuntime; if(id==='react-dom')return ReactDOMRuntime; if(id==='react/jsx-runtime')return JSXRuntime; throw new Error('Unexpected runtime dependency: '+id); };`,
    },
    external: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "remotion",
    ],
    define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
    loader: {
      ".woff": "dataurl",
      ".woff2": "dataurl",
      ".png": "dataurl",
      ".svg": "dataurl",
    },
    plugins: [createSourcePlugin(aliases, outputDirectory, onBuilt)],
  };
}

/** Compile the current worktree's components without copying product source. */
export async function buildProduct({
  watch = false,
  onBuilt = async () => {},
  outputDirectory = path.join(root, "src/avandar/generated"),
} = {}) {
  requireLicense();
  const aliases = await readAliases();
  await fs.mkdir(outputDirectory, { recursive: true });
  const options = createBuildOptions(aliases, outputDirectory, onBuilt);
  if (watch) {
    const builder = await context(options);
    await builder.rebuild();
    await builder.watch();
    return builder;
  }
  await build(options);
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv.slice(2).some((arg) => arg !== "--watch"))
    throw new Error(
      "Usage: component:build [--watch]. Product source is always this Avandar worktree.",
    );
  await buildProduct({ watch: process.argv.includes("--watch") });
}
