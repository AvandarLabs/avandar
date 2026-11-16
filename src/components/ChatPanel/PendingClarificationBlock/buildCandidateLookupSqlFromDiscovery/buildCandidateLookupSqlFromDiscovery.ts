import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

/**
 * Builds a local query that finds the stored values matching a discovery's
 * prompt-derived candidates, without regard to case or surrounding spaces.
 *
 * A discovery lists at most 100 values in alphabetical order, so a column
 * with more values (counties, countries) can leave out the very value the user
 * named. Running this beside the discovery finds it wherever it sorts, for
 * example "United Kingdom" past the 100th country. Undefined when there are no
 * candidates or the discovery does not read exactly one relation.
 */
export function buildCandidateLookupSqlFromDiscovery(
  options: Readonly<{
    discoveryQuery: string;
    column: string;
    candidateValues: readonly string[];
  }>,
): string | undefined {
  const candidateLiterals = Array.from(
    new Set(
      options.candidateValues
        .map((candidateValue) => {
          return candidateValue.normalize("NFKC").trim().toLowerCase();
        })
        .filter((candidateValue) => {
          return candidateValue.length > 0;
        }),
    ),
  ).map(quoteSqlLiteral);
  if (candidateLiterals.length === 0) {
    return undefined;
  }
  let relations: RelationRef.T[];
  try {
    relations = DuckDbSqlAnalyzer.getRelationsFromSqlTableReferences(
      options.discoveryQuery,
    );
  } catch {
    return undefined;
  }
  if (relations.length !== 1) {
    return undefined;
  }
  const tableName = quoteSqlIdentifier(RelationRef.toTableName(relations[0]!));
  const column = quoteSqlIdentifier(options.column);
  return `SELECT DISTINCT ${column} FROM ${tableName} WHERE lower(trim(CAST(${column} AS VARCHAR))) IN (${candidateLiterals.join(", ")})`;
}
