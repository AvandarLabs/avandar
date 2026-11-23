function _hasCompetingCollectionSites(sourceCode) {
  const sites = new Set();
  const visit = (node, owner) => {
    const functionOwner = /Function/.test(node.type) ? node : owner;
    if (node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" && !node.callee.computed) {
      const method = node.callee.property.name;
      if (["map", "filter", "push"].includes(method)) {
        sites.add(method === "push" ? functionOwner ?? node : node);
      }
    }
    (sourceCode.visitorKeys[node.type] ?? []).forEach((key) => {
      const children = Array.isArray(node[key]) ? node[key] : [node[key]];
      children.filter(Boolean).forEach((child) => {
        visit(child, functionOwner);
      });
    });
  };
  visit(sourceCode.ast, undefined);
  return sites.size > 1;
}

function _findVariable(scope, name) {
  if (!scope) {
    return undefined;
  }
  return scope.set.get(name) ?? _findVariable(scope.upper, name);
}

function _getLeadingImports(sourceCode, node) {
  const imports = [];
  sourceCode.ast.body.some((statement) => {
    if (statement.type !== "ImportDeclaration") {
      return true;
    }
    if (statement.range[1] < node.range[0] &&
      statement.source.value === "@avandar/utils" &&
      statement.importKind !== "type") {
      imports.push(statement);
    }
    return false;
  });
  return imports;
}

function _getExistingBinding(sourceCode, node, imports, name) {
  const specifier = imports.flatMap((entry) => {
    return entry.specifiers;
  }).find((entry) => {
    return entry.type === "ImportSpecifier" && entry.importKind !== "type" &&
      entry.imported.name === name;
  });
  const namespace = imports.flatMap((entry) => { return entry.specifiers; })
    .find((entry) => { return entry.type === "ImportNamespaceSpecifier"; });
  const binding = specifier ?? namespace;
  if (!binding) {
    return undefined;
  }
  const variable = _findVariable(sourceCode.getScope(node), binding.local.name);
  return variable?.identifiers.includes(binding.local)
    ? { localName: specifier ? specifier.local.name
      : `${namespace.local.name}.${name}`, fix: () => { return []; } }
    : false;
}

function _hasTypeAncestor(node) {
  return node && (node.type.startsWith("TS") || _hasTypeAncestor(node.parent));
}

function _hasImportRepairBoundary(sourceCode) {
  return sourceCode.ast.body.some((statement) => {
    return statement.type === "ImportDeclaration" &&
      statement.source.value === "@avandar/utils" &&
      (statement.importKind === "type" || statement.specifiers.some((specifier) => {
        return specifier.importKind === "type";
      }) || sourceCode.getDeclaredVariables(statement).some((variable) => {
        return variable.references.some((reference) => {
          return _hasTypeAncestor(reference.identifier.parent);
        });
      }));
  });
}

/**
 * Plans a helper binding for safe utility rewrites without introducing a new
 * dependency evaluation or changing a script's global binding contract.
 */
export function getUtilityImport(sourceCode, node, name, filename) {
  if (/\/(?:packages\/shared\/utils|node_modules\/@avandar\/utils)\//
    .test(filename.replaceAll("\\", "/")) || /\.c(?:ts|js)$/
    .test(filename)) {
    return undefined;
  }
  const imports = _getLeadingImports(sourceCode, node);
  if (!imports.length || _hasImportRepairBoundary(sourceCode)) {
    return undefined;
  }
  const existing = _getExistingBinding(sourceCode, node, imports, name);
  if (existing !== undefined) {
    return existing || undefined;
  }
  if (_hasCompetingCollectionSites(sourceCode) ||
    sourceCode.getTokens(sourceCode.ast).some((token) => {
    return [name, "eval", "Function"].includes(token.value);
  })) {
    return undefined;
  }
  const declaration = imports.at(-1);
  if (sourceCode.getCommentsInside(declaration).length ||
    declaration.attributes?.length || declaration.assertions?.length) {
    return undefined;
  }
  const named = declaration.specifiers.filter((specifier) => {
    return specifier.type === "ImportSpecifier";
  });
  if (!named.length && declaration.specifiers.length) {
    return undefined;
  }
  return { localName: name, declaration, hasEdits: true, fix(fixer) {
    return [named.length
      ? fixer.insertTextAfter(named.at(-1), `, ${name}`)
      : fixer.insertTextBefore(declaration.source, `{ ${name} } from `)];
  } };
}
