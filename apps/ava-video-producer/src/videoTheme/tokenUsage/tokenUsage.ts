import { createContext } from "react";
import { isTokenDefinition, isTokenScale } from "../tokenCatalog/defineTokens";
import type { CatalogNode } from "../videoTheme.types";

/** Receives the path of each token a render reads, such as `color.accent`. */
export type TokenUsageReporter = (tokenPath: string) => void;

/**
 * Where themed renders report the tokens they read. Unset by default, so
 * renders pay nothing. The token editor sets it to show the tokens an item
 * actually uses.
 */
export const VideoTokenUsageContext = createContext<
  TokenUsageReporter | undefined
>(undefined);

/** A set of token paths reported by renders, read back sorted. */
export type TokenUsageCollector = Readonly<{
  report: TokenUsageReporter;
  getPaths: () => readonly string[];
  clear: () => void;
}>;

/**
 * Collects token paths reported through `VideoTokenUsageContext`, for
 * example while a preview plays, so an editor can filter to "used by this
 * item".
 */
export function createTokenUsageCollector(): TokenUsageCollector {
  const paths = new Set<string>();
  return {
    report: (path) => {
      paths.add(path);
    },
    getPaths: () => [...paths].sort(),
    clear: () => paths.clear(),
  };
}

/**
 * Wraps resolved tokens so reading one reports its catalog path. Reads stop
 * at a token: reading `heading.fontSize` reports `text.stage.heading`. The
 * wrapped objects must not be frozen, because a proxy cannot return a
 * different object for a frozen property.
 */
export function createTokenUsageProxy<Value extends object>(
  options: Readonly<{
    value: Value;
    catalog: CatalogNode;
    basePath: readonly string[];
    report: TokenUsageReporter;
  }>,
): Value {
  const { value, catalog, basePath, report } = options;
  return new Proxy(value, {
    get(target, key, receiver) {
      const child: unknown = Reflect.get(target, key, receiver);
      if (
        typeof key !== "string" ||
        isTokenDefinition(catalog) ||
        isTokenScale(catalog) ||
        !Object.hasOwn(catalog, key)
      ) {
        return child;
      }
      const node = catalog[key];
      const path = [...basePath, key];
      if (isTokenDefinition(node) || isTokenScale(node)) {
        report(path.join("."));
        return child;
      }
      return typeof child === "object" && child !== null
        ? createTokenUsageProxy({
            value: child,
            catalog: node,
            basePath: path,
            report,
          })
        : child;
    },
  });
}
