import type {
  RelationCallCap,
  RelationRowDescriptor,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * Gets one `RelationCallCap`'s concrete value for the relation actually
 * being acquired - calling it if it is a function, passing it through
 * unchanged otherwise.
 */
export function getRelationCallCapValue(
  cap: RelationCallCap,
  descriptor: RelationRowDescriptor,
): number | "unbounded" {
  return typeof cap === "function" ? cap(descriptor) : cap;
}

function _isWithinCap(count: number, cap: number | "unbounded"): boolean {
  return cap === "unbounded" || count <= cap;
}

/** Input to {@link isWithinRelationCallCaps}. */
export type RelationCallCapsCheck = {
  rowCount: number;
  byteCount: number;
  maxRowsPerCall: RelationCallCap;
  maxBytesPerCall: RelationCallCap;
  descriptor: RelationRowDescriptor;
};

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
  options: Readonly<RelationCallCapsCheck>,
): boolean {
  const resolvedMaxRows = getRelationCallCapValue(
    options.maxRowsPerCall,
    options.descriptor,
  );
  const resolvedMaxBytes = getRelationCallCapValue(
    options.maxBytesPerCall,
    options.descriptor,
  );
  return (
    _isWithinCap(options.rowCount, resolvedMaxRows) &&
    _isWithinCap(options.byteCount, resolvedMaxBytes)
  );
}
