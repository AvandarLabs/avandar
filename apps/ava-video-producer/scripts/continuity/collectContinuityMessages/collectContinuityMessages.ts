import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { parse } from "yaml";
import { z } from "zod";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import type { ContinuityPlan } from "../../../src/continuity/continuitySchema";

const CATALOG_COPY = z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    goodFor: z.string().optional(),
    tags: z.array(z.string()).optional(),
    creativeDirection: z.string().optional(),
    avoid: z.string().optional(),
    controls: z
      .array(z.object({ label: z.string(), description: z.string() }))
      .optional(),
  }),
);

function _getStaticStrings(options: {
  node?: ts.Node;
  declarations: Map<string, ts.Expression>;
  seen?: Set<string>;
}): string[] {
  const { node, declarations, seen = new Set<string>() } = options;
  const readChildStrings = (child?: ts.Node) =>
    _getStaticStrings({
      node: child,
      declarations,
      seen,
    });
  if (!node || ts.isStringLiteralLike(node)) {
    return node ? [node.text] : [];
  }
  if (ts.isIdentifier(node) && !seen.has(node.text)) {
    return _getStaticStrings({
      node: declarations.get(node.text),
      declarations,
      seen: new Set([...seen, node.text]),
    });
  }
  if (ts.isConditionalExpression(node)) {
    return [node.whenTrue, node.whenFalse].flatMap(readChildStrings);
  }
  if (
    ts.isElementAccessExpression(node) ||
    ts.isParenthesizedExpression(node)
  ) {
    return readChildStrings(node.expression);
  }
  if (ts.isBinaryExpression(node)) {
    return [node.left, node.right].flatMap(readChildStrings);
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((property) =>
      ts.isPropertyAssignment(property)
        ? readChildStrings(property.initializer)
        : [],
    );
  }
  return [];
}

async function _collectFileCopy(options: {
  file: string;
  messages: Set<string>;
}) {
  const { file, messages } = options;
  const source = ts.createSourceFile(
    file,
    await fs.readFile(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations = new Map<string, ts.Expression>();
  const visitDeclaration = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visitDeclaration);
  };
  visitDeclaration(source);
  const visitCopy = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "translate"
    ) {
      _getStaticStrings({ node: node.arguments[0], declarations }).forEach(
        (message) => messages.add(message),
      );
    }
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === "message" &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      messages.add(node.initializer.text);
    }
    ts.forEachChild(node, visitCopy);
  };
  visitCopy(source);
}

async function _collectStaticCopy(options: {
  directory: string;
  messages: Set<string>;
}) {
  const { directory, messages } = options;
  const files = await fs.readdir(directory, { recursive: true });
  await Promise.all(
    files
      .filter(
        (file) =>
          /\.tsx?$/.test(file) &&
          !file.includes(".test.") &&
          !file.startsWith("i18n/"),
      )
      .map((file) =>
        _collectFileCopy({ file: path.join(directory, file), messages }),
      ),
  );
}

function _collectPlanCopy(options: {
  plan: ContinuityPlan;
  messages: Set<string>;
}) {
  const { plan, messages } = options;
  [plan.title, plan.evidence].forEach((message) => messages.add(message));
  plan.beats.forEach((beat) => {
    [beat.title, beat.subtitle, beat.token?.label].forEach((message) => {
      if (message) {
        messages.add(message);
      }
    });
    if (beat.content.kind === "thesis") {
      [...beat.content.lines, beat.content.emphasis].forEach((message) =>
        messages.add(message),
      );
    }
    if (beat.content.kind === "composite") {
      beat.content.diagrams.forEach((diagram) => {
        messages.add(diagram.label);
        if ("detail" in diagram && typeof diagram.detail === "string") {
          messages.add(diagram.detail);
        }
      });
    }
  });
}

async function _collectAuthoredCopy(options: {
  root: string;
  messages: Set<string>;
}) {
  const { root, messages } = options;
  const directory = path.join(root, "storyboards/explainers");
  const files = (await fs.readdir(directory)).filter((file) =>
    file.endsWith(".json"),
  );
  await Promise.all(
    files.map(async (file) => {
      const plan = storyboardSchema.parse(
        JSON.parse(await fs.readFile(path.join(directory, file), "utf8")),
      );
      messages.add(plan.title);
      plan.narration.forEach((cue) => messages.add(cue.text));
      plan.shots.forEach((shot) => {
        if (shot.scene === "continuity") {
          _collectPlanCopy({ plan: shot.props, messages });
        }
      });
    }),
  );
}

async function _collectCatalogCopy(options: {
  root: string;
  messages: Set<string>;
}) {
  const { root, messages } = options;
  await Promise.all(
    ["films/filmCatalog.yaml", "vocabulary/studyCatalog.yaml"].map(
      async (file) => {
        const entries = CATALOG_COPY.parse(
          parse(
            await fs.readFile(path.join(root, "src/continuity", file), "utf8"),
          ),
        );
        entries.forEach((entry) => {
          [
            entry.title,
            entry.description,
            entry.goodFor,
            entry.avoid,
            entry.creativeDirection,
            ...(entry.tags ?? []),
          ].forEach((message) => {
            if (message) {
              messages.add(message);
            }
          });
          entry.controls?.forEach((control) => {
            messages.add(control.label);
            messages.add(control.description);
          });
        });
      },
    ),
  );
}

/** Collects authored continuity prose and statically resolved gallery copy. */
export async function collectContinuityMessages(
  root: string,
): Promise<Record<string, string>> {
  const messages = new Set<string>();
  await Promise.all([
    _collectAuthoredCopy({ root, messages }),
    _collectCatalogCopy({ root, messages }),
    _collectStaticCopy({
      directory: path.join(root, "src/continuity"),
      messages,
    }),
  ]);
  return Object.fromEntries(
    [...messages]
      .filter(Boolean)
      .sort()
      .map((message) => [`continuity.${message}`, message]),
  );
}
