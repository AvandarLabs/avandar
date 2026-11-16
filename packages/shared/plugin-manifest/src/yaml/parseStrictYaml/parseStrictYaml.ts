import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
import { parseDocument } from "yaml";

function _readDocumentValue(options: {
  document: ReturnType<typeof parseDocument>;
  sourcePath: string;
}): unknown {
  try {
    // `maxAliasCount: 0` rejects every alias: hand-written config has no use
    // for them, and they enable exponential expansion.
    return options.document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: [error instanceof Error ? error.message : String(error)],
    });
  }
}

/**
 * Parses the text of a hand-written YAML config file into plain data,
 * refusing anything the parser would have to guess about: YAML 1.2 core
 * types only (so `NO` stays a string), duplicate keys, aliases, and every
 * parser warning such as an unresolved tag are all errors.
 *
 * Use it for config files whose meaning must be unambiguous, such as plugin
 * manifests or lists of plugins. Returns `null` when the text holds no
 * document, so each caller decides whether an empty file is valid. Throws
 * `PluginManifestError` naming `sourcePath` when the text is not valid.
 */
export function parseStrictYaml(
  options: Readonly<{ yamlText: string; sourcePath: string }>,
): unknown {
  const { yamlText, sourcePath } = options;
  const document = parseDocument(yamlText, {
    version: "1.2",
    schema: "core",
    uniqueKeys: true,
  });
  // A YAML warning, such as an unresolved tag, means the parser guessed what
  // the author meant. Config should never be built from a guess.
  const problems = [...document.errors, ...document.warnings];
  if (problems.length > 0) {
    throw new PluginManifestError({
      sourcePath,
      issues: problems.map((problem) => {
        return problem.message;
      }),
    });
  }
  return _readDocumentValue({ document, sourcePath }) ?? null;
}
