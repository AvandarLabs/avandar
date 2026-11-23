import canonicalBlockComments from "./rules/canonical-block-comments.js";

/**
 * Stylelint plugins for safe CSS comment normalization.
 * For example, register these plugins and enable
 * `avandar/canonical-block-comments`
 * to normalize eligible standalone CSS block comments.
 */
const plugins = [canonicalBlockComments];
export default plugins;
