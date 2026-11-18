import { PLACEHOLDER_LIKE } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";

/**
 * What a placeholder from a closed vault reads as in a model's recap. No
 * vault ever issues or unmasks it, so it can never stand for a value.
 */
export const EARLIER_VALUE_TEXT = "[earlier value]";

const EVERY_PLACEHOLDER_LIKE = new RegExp(PLACEHOLDER_LIKE.source, "gi");

/**
 * Text with every placeholder (`<value 1>`, in any case, spacing, or zero
 * padding) replaced by {@link EARLIER_VALUE_TEXT}.
 *
 * Use it on the text of an earlier chat before a new conversation's model
 * reads it, for example a recap of a thread the agent has not seen. A
 * placeholder's number means a value only inside the vault that issued it,
 * and a new conversation's vault numbers other values from `<value 1>`
 * again, so an old placeholder left in the text could be read as one of
 * them and unmasked to someone else's value.
 */
export function hideEarlierPlaceholders(text: string): string {
  return text.replace(EVERY_PLACEHOLDER_LIKE, EARLIER_VALUE_TEXT);
}
