import type {
  RelationCallCap,
  RelationRowDescriptor,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * Resolves one `RelationCallCap` to its concrete value for the relation
 * actually being acquired - calling it if it is a function, passing it
 * through unchanged otherwise.
 */
export function resolveRelationCallCap(
  cap: RelationCallCap,
  descriptor: RelationRowDescriptor,
): number | "unbounded" {
  return typeof cap === "function" ? cap(descriptor) : cap;
}

function _isWithinCap(count: number, cap: number | "unbounded"): boolean {
  return cap === "unbounded" || count <= cap;
}

/**
 * Whether a relation's actual row count and byte size both stay within
 * their declared caps for the relation being acquired.
 *
 * Both axes are resolved and checked independently, and both must pass -
 * `maxRowsPerCall` and `maxBytesPerCall` are never a fallback for each
 * other. A source that only meaningfully caps one axis declares the other
 * `"unbounded"` (directly, or by returning `"unbounded"` from a function
 * cap when it cannot compute a value for that axis), which always passes
 * here - that is how one axis opts out, not a third state this function
 * needs to know about separately.
 */
export function isWithinRelationCallCaps(
  options: Readonly<{
    rowCount: number;
    byteCount: number;
    maxRowsPerCall: RelationCallCap;
    maxBytesPerCall: RelationCallCap;
    descriptor: RelationRowDescriptor;
  }>,
): boolean {
  const resolvedMaxRows = resolveRelationCallCap(
    options.maxRowsPerCall,
    options.descriptor,
  );
  const resolvedMaxBytes = resolveRelationCallCap(
    options.maxBytesPerCall,
    options.descriptor,
  );
  return (
    _isWithinCap(options.rowCount, resolvedMaxRows) &&
    _isWithinCap(options.byteCount, resolvedMaxBytes)
  );
}
