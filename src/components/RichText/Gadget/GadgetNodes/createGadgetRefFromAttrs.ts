import { isGadgetRef } from "$/models/gadgets/Gadget/Gadget";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

/**
 * Reads a gadget ref from a gadget node's attributes. Returns `undefined`
 * when they do not form a valid ref, so a malformed node draws nothing
 * instead of failing. Use it wherever a gadget node is read or drawn, such
 * as the editor's node views and `RichTextView`.
 */
export function createGadgetRefFromAttrs(
  attrs: Record<string, unknown>,
): Gadget.Ref | undefined {
  const candidate = {
    gadgetType: attrs.gadgetType,
    gadgetId: attrs.gadgetId,
    subId: attrs.subId ?? null,
  };
  return isGadgetRef(candidate) ? candidate : undefined;
}
