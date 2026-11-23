import { eslintCompatPlugin } from "@oxlint/plugins";
import functionBodyLineComments from "./rules/function-body-line-comments.js";
import singleLineShortJsdoc from "./rules/single-line-short-jsdoc.js";
import exportKeyJsdoc from "./rules/export-key-jsdoc.js";
import topLevelFunctionDeclarations from "./rules/top-level-function-declarations.js";
import nestedArrowFunctions from "./rules/nested-arrow-functions.js";
import privateHelperPrefix from "./rules/private-helper-prefix.js";

import componentPropsName from "./rules/component-props-name.js";
import localE2eCasing from "./rules/local-e2e-casing.js";
import jsxConditionalTernary from "./rules/jsx-conditional-ternary.js";

import propertyHelperCallbacks from "./rules/property-helper-callbacks.js";
import straightLineObjectConstruction from "./rules/straight-line-object-construction.js";
import optionalArrayCandidates from "./rules/optional-array-candidates.js";

/** Oxlint plugin entry with safe current-file repairs. */
const plugin = eslintCompatPlugin({
  meta: { name: "@avandar/lint-typescript" },
  rules: {
    "function-body-line-comments": functionBodyLineComments,
    "single-line-short-jsdoc": singleLineShortJsdoc,
    "export-key-jsdoc": exportKeyJsdoc,
    "top-level-function-declarations": topLevelFunctionDeclarations,
    "nested-arrow-functions": nestedArrowFunctions,
    "private-helper-prefix": privateHelperPrefix,
    "component-props-name": componentPropsName,
    "local-e2e-casing": localE2eCasing,
    "jsx-conditional-ternary": jsxConditionalTernary,
    "property-helper-callbacks": propertyHelperCallbacks,
    "straight-line-object-construction": straightLineObjectConstruction,
    "optional-array-candidates": optionalArrayCandidates,
  },
});
export default plugin;
