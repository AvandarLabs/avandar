import Link from "@tiptap/extension-link";
import { isSafeLinkHref } from "$/models/RichTextDocument/RichTextDocument";

/** A URI scheme such as `https:` or `javascript:` at the start of input. */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/** An email address with no scheme, such as `dana@example.org`. */
const BARE_EMAIL_PATTERN = /^[^\s@/:]+@(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

/** A domain with no scheme, such as `www.example.org/lab?id=1`. */
const BARE_DOMAIN_PATTERN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i;

/**
 * The href to store for a typed or entered link address, or `undefined`
 * when it may not become a link. Web and email links keep their scheme,
 * a bare email address gets `mailto:`, a bare domain gets `https://`, and
 * any other scheme is refused.
 */
export function getSafeLinkHrefFromInput(input: string): string | undefined {
  const trimmedInput = input.trim();
  if (SCHEME_PATTERN.test(trimmedInput)) {
    return isSafeLinkHref(trimmedInput) ? trimmedInput : undefined;
  }
  if (BARE_EMAIL_PATTERN.test(trimmedInput)) {
    return `mailto:${trimmedInput}`;
  }
  if (BARE_DOMAIN_PATTERN.test(trimmedInput)) {
    return `https://${trimmedInput}`;
  }
  return undefined;
}

/**
 * Links limited to web and email addresses. TipTap checks the raw typed text
 * (such as `example.com`) before autolinking, so scheme-less addresses pass
 * the check, and the link commands store them with a scheme so every saved
 * href is one the stored document schema accepts.
 */
export const SafeLink = Link.extend({
  addCommands() {
    const parentCommands = this.parent?.();
    return {
      ...parentCommands,
      setLink: (attributes) => {
        return (commandProps) => {
          const href = getSafeLinkHrefFromInput(attributes.href);
          if (!href || !parentCommands?.setLink) {
            return false;
          }
          return parentCommands.setLink({ ...attributes, href })(commandProps);
        };
      },
      toggleLink: (attributes) => {
        return (commandProps) => {
          if (!parentCommands?.toggleLink) {
            return false;
          }
          if (!attributes?.href) {
            return parentCommands.toggleLink(attributes)(commandProps);
          }
          const href = getSafeLinkHrefFromInput(attributes.href);
          if (!href) {
            return false;
          }
          return parentCommands.toggleLink({ ...attributes, href })(
            commandProps,
          );
        };
      },
    };
  },
}).configure({
  openOnClick: false,
  autolink: true,
  defaultProtocol: "https",
  isAllowedUri: (url) => {
    return getSafeLinkHrefFromInput(url) !== undefined;
  },
});
