import { eslintCompatPlugin } from "@oxlint/plugins";
import functionBodyLineComments from "./rules/function-body-line-comments.js";
import singleLineShortJsdoc from "./rules/single-line-short-jsdoc.js";
import exportKeyJsdoc from "./rules/export-key-jsdoc.js";

/** Oxlint plugin entry with ESLint-compatible safe comment repairs. */
const plugin = eslintCompatPlugin({
  meta: { name: "@avandar/lint-typescript" },
  rules: {
    "function-body-line-comments": functionBodyLineComments,
    "single-line-short-jsdoc": singleLineShortJsdoc,
    "export-key-jsdoc": exportKeyJsdoc,
  },
});
export default plugin;
