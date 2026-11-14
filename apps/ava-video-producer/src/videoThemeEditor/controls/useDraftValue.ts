import { useState } from "react";

type DraftValueOptions<Value, Draft> = Readonly<{
  /** The value the field shows when nobody is typing. */
  value: Value;
  /** A stable text key for a value, so equal arrays or objects compare equal. */
  toKey: (value: Value) => string;
  toDraft: (value: Value) => Draft;
  /** The value a draft names, or `undefined` while it is incomplete or invalid. */
  parse: (draft: Draft) => Value | undefined;
  onChange: (value: Value) => void;
}>;

/** What a field binds to: the draft it shows and how it changes. */
export type DraftValue<Draft> = Readonly<{
  draft: Draft;
  isValid: boolean;
  /** Keeps what was typed and emits it once it parses. */
  change: (draft: Draft) => void;
  /** Puts back the last valid value, such as when the field loses focus. */
  revert: () => void;
}>;

/**
 * Keeps a field's typed text apart from the value it edits, so a half-typed
 * entry stays on screen instead of snapping back. The draft follows `value`
 * whenever it changes from outside, such as a reset, but not when it changes
 * because this field emitted it. For example, the hex colour and number
 * fields of the token controls bind to it.
 */
export function useDraftValue<Value, Draft>({
  value,
  toKey,
  toDraft,
  parse,
  onChange,
}: DraftValueOptions<Value, Draft>): DraftValue<Draft> {
  const valueKey = toKey(value);
  const [draft, setDraft] = useState(() => toDraft(value));
  const [syncedKey, setSyncedKey] = useState(valueKey);
  if (syncedKey !== valueKey) {
    setSyncedKey(valueKey);
    setDraft(toDraft(value));
  }
  const change = (nextDraft: Draft) => {
    setDraft(nextDraft);
    const parsed = parse(nextDraft);
    if (parsed !== undefined) {
      setSyncedKey(toKey(parsed));
      onChange(parsed);
    }
  };
  const revert = () => setDraft(toDraft(value));
  return { draft, isValid: parse(draft) !== undefined, change, revert };
}
