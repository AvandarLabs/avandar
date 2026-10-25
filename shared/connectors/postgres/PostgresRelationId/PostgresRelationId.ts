type _SplitState = {
  parts: string[];
  current: string;
  escaped: boolean;
};

function _escapeRelationIdPart(part: string): string {
  return part.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
}

/**
 * Builds the wire-format id for one relation: a schema name and a
 * table/view name, joined so {@link _splitRelationId} can always split them
 * back apart exactly - even when either one (or both) contains a literal
 * `.`, which any Postgres identifier can once it is quoted. A literal `\`
 * or `.` in either part is escaped before joining, so exactly one
 * unescaped `.` remains: the real separator.
 */
function _makeRelationId(schemaName: string, tableName: string): string {
  return `${_escapeRelationIdPart(schemaName)}.${_escapeRelationIdPart(tableName)}`;
}

/**
 * Splits a relation id built by {@link _makeRelationId} back into its schema
 * and table name, unescaping each part. Returns `undefined` for a
 * malformed id (no unescaped separator, or an empty half) rather than
 * guessing - the caller decides how to report that.
 *
 * Splitting on the first or the last unescaped `.` would both be wrong in
 * general: a schema name and a table name can each independently contain a
 * literal `.`, so only an escaped encoding - never a positional rule about
 * which end of the string to split from - identifies the real separator
 * correctly in every case.
 */
function _splitRelationId(
  relationId: string,
): { schemaName: string; tableName: string } | undefined {
  const { parts, current } = Array.from(relationId).reduce(
    (state: _SplitState, char): _SplitState => {
      if (state.escaped) {
        return {
          parts: state.parts,
          current: state.current + char,
          escaped: false,
        };
      }
      if (char === "\\") {
        return { parts: state.parts, current: state.current, escaped: true };
      }
      if (char === ".") {
        return {
          parts: [...state.parts, state.current],
          current: "",
          escaped: false,
        };
      }
      return {
        parts: state.parts,
        current: state.current + char,
        escaped: false,
      };
    },
    { parts: [], current: "", escaped: false },
  );
  const allParts = [...parts, current];
  const [schemaName, tableName] = allParts;
  if (allParts.length !== 2 || !schemaName || !tableName) {
    return undefined;
  }
  return { schemaName, tableName };
}

/** Encodes and decodes a Postgres relation's wire-format id. */
export const PostgresRelationId = {
  makeRelationId: _makeRelationId,
  splitRelationId: _splitRelationId,
};
