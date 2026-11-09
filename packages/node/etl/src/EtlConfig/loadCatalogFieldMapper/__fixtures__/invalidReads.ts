/** Test fixture: a `reads` export that is not a list of dotted paths. */
export const reads = ["name", "not a path"];

export default function invalidReads(): unknown {
  return undefined;
}
