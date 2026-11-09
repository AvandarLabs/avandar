/** Test fixture: the record's `name`, declaring that it consumes it. */
export const reads = ["name"];

export default function readsName(record: unknown): unknown {
  return (record as { name?: unknown }).name;
}
