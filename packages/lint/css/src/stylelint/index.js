import canonicalBlockComments from "./rules/canonical-block-comments.js";

/** Stylelint rules with parser-proved, independently tested safe repairs. */
const plugins = [canonicalBlockComments];
export default plugins;
