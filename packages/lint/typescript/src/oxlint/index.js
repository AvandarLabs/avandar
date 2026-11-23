import { eslintCompatPlugin } from "@oxlint/plugins";
import functionBodyLineComments from "./rules/function-body-line-comments.js";
import singleLineShortJsdoc from "./rules/single-line-short-jsdoc.js";
import exportKeyJsdoc from "./rules/export-key-jsdoc.js";
import topLevelFunctionDeclarations from "./rules/top-level-function-declarations.js";
import nestedArrowFunctions from "./rules/nested-arrow-functions.js";
import privateHelperPrefix from "./rules/private-helper-prefix.js";

/** Oxlint plugin entry with safe comment and function repairs. */
const plugin = eslintCompatPlugin({
  meta: { name: "@avandar/lint-typescript" },
  rules: {
    "function-body-line-comments": functionBodyLineComments,
    "single-line-short-jsdoc": singleLineShortJsdoc,
    "export-key-jsdoc": exportKeyJsdoc,
    "top-level-function-declarations": topLevelFunctionDeclarations,
    "nested-arrow-functions": nestedArrowFunctions,
    "private-helper-prefix": privateHelperPrefix,
  },
});
export default plugin;
